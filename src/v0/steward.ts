import { BigInt, Address } from "@graphprotocol/graph-ts";
import {
  Steward,
  LogBuy,
  LogPriceChange,
  LogForeclosure,
  LogCollection,
  LogRemainingDepositUpdate,
  AddToken,
} from "../../generated/Steward/Steward";
import {
  Wildcard,
  Patron,
  PreviousPatron,
  Price,
  TokenUri,
  BuyEvent,
  EventCounter,
  ChangePriceEvent,
  Global,
} from "../../generated/schema";
import { Token } from "../../generated/Token/Token";
import { log } from "@graphprotocol/graph-ts";
import {
  ZERO_ADDRESS,
  NUM_SECONDS_IN_YEAR,
  AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT,
  NUM_SECONDS_IN_YEAR_BIG_INT,
  BILLION,
  VITALIK_PATRONAGE_NUMERATOR,
  VITALIK_PATRONAGE_DENOMINATOR,
  GLOBAL_PATRONAGE_DENOMINATOR,
  SIMON_DLR_ADDRESS,
} from "../CONSTANTS";
import {
  getForeclosureTimeSafe,
  minBigInt,
  updateForeclosedTokens,
  removeFromArrayAtIndex,
  handleAddTokenUtil,
} from "../util";
import {
  getTotalCollectedAccurate,
  getTotalOwedAccurate,
  getTotalTokenCostScaledNumerator,
} from "../util/hacky";
import {
  getTokenIdFromTxTokenPrice,
  isVintageVitalik,
  createWildcardIfDoesntExist,
  getTokenIdFromTimestamp,
  createCounterIfDoesntExist,
} from "./helpers";

// TODO:: check on every block header if there are any foreclosures or do other updates to data. See how feasible this is.
export function handleLogBuy(event: LogBuy): void {
  let owner = event.params.owner;
  let ownerString = owner.toHexString();
  let txTimestamp = event.block.timestamp;

  // NOTE:: This is a bit hacky since LogBuy event doesn't include token ID.
  //        Get both patrons (since we don't know which one it is - didn't catch this at design time)
  let steward = Steward.bind(event.address);
  let tokenId = getTokenIdFromTxTokenPrice(
    steward,
    event.params.price,
    owner,
    txTimestamp
  );

  if (tokenId == -1) {
    return;
  } // Normal ly this means a foreclosed token was bought. Will need to fix in future versions of the smart contracts!

  // Don't re-add the 'vintage' Vitalik...
  // TODO:: this should be before a given block number - get this block number from when simon buys it!
  let tokenIdString = tokenId.toString();
  let tokenIdBigInt = BigInt.fromI32(tokenId);

  // tokenId.equals(BigInt.fromI32(42)) && blockNumber.lt(BigInt.fromI32(9077429))
  if (isVintageVitalik(tokenIdBigInt, event.block.number)) {
    // This was the transaction that simon upgraded vitalik (so the deposit was updated!)
    if (
      event.transaction.hash.toHexString() ==
      "0x819abe91008e8e22034b57efcff070c26690cbf55b7640bea6f93ffc26184d90"
    ) {
      let VITALIK_PRICE = steward.price(tokenIdBigInt);
      let patron = Patron.load(ownerString);
      patron.availableDeposit = steward.depositAbleToWithdraw(owner);

      // This is for Vitalik+Simon, so token didn't foreclose, and he only holds 1 token.
      let timeSinceLastUpdate = txTimestamp.minus(patron.lastUpdated);
      patron.totalTimeHeld = patron.totalTimeHeld.plus(timeSinceLastUpdate);
      patron.totalContributed = patron.totalContributed.plus(
        patron.patronTokenCostScaledNumerator
          .times(timeSinceLastUpdate)
          .div(VITALIK_PATRONAGE_DENOMINATOR)
          .div(NUM_SECONDS_IN_YEAR_BIG_INT)
      );
      patron.patronTokenCostScaledNumerator = VITALIK_PRICE.times(
        VITALIK_PATRONAGE_NUMERATOR
      );

      let patronagePerSecond = VITALIK_PRICE.times(VITALIK_PATRONAGE_NUMERATOR)
        .div(VITALIK_PATRONAGE_DENOMINATOR)
        .div(NUM_SECONDS_IN_YEAR_BIG_INT);

      patron.foreclosureTime = txTimestamp.plus(
        patron.availableDeposit.div(patronagePerSecond)
      );
      patron.lastUpdated = txTimestamp;
      patron.save();
    }
    return;
  } //Temporarily before token is migrated

  let wildcard = Wildcard.load(tokenIdString);

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(steward, tokenIdBigInt);
  }

  let previousTimeWildcardWasAcquired = wildcard.timeAcquired;

  // Entity fields can be set using simple assignments
  wildcard.tokenId = BigInt.fromI32(tokenId);

  wildcard.priceHistory = wildcard.priceHistory.concat([wildcard.price]);

  let previousTokenOwnerString = wildcard.owner;

  let patron = Patron.load(ownerString);
  let patronOld = Patron.load(previousTokenOwnerString);
  if (patron == null) {
    patron = new Patron(ownerString);
    patron.address = owner;
    patron.totalTimeHeld = BigInt.fromI32(0);
    patron.totalContributed = BigInt.fromI32(0);
    patron.patronTokenCostScaledNumerator = BigInt.fromI32(0);
    patron.tokens = [];
    patron.previouslyOwnedTokens = [];
    patron.lastUpdated = txTimestamp;
    patron.foreclosureTime = txTimestamp;
  }

  // Now even if the patron puts in extra deposit when they buy a new token this will foreclose their old tokens.
  let heldUntil = minBigInt(patron.foreclosureTime, txTimestamp);

  let timeSinceLastUpdate = heldUntil.minus(patron.lastUpdated);
  patron.totalTimeHeld = patron.totalTimeHeld.plus(
    timeSinceLastUpdate.times(BigInt.fromI32(patron.tokens.length))
  );
  patron.totalContributed = patron.totalContributed.plus(
    patron.patronTokenCostScaledNumerator
      .times(timeSinceLastUpdate)
      .div(GLOBAL_PATRONAGE_DENOMINATOR)
      .div(NUM_SECONDS_IN_YEAR_BIG_INT)
  );
  patron.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    owner
  );
  patron.lastUpdated = txTimestamp;

  // Add to previouslyOwnedTokens if not already there
  patron.previouslyOwnedTokens =
    patron.previouslyOwnedTokens.indexOf(wildcard.id) === -1
      ? patron.previouslyOwnedTokens.concat([wildcard.id])
      : patron.previouslyOwnedTokens;
  patron.availableDeposit = steward.depositAbleToWithdraw(owner);
  patron.foreclosureTime = getForeclosureTimeSafe(steward, owner);
  // Add token to the patrons currently held tokens
  patron.tokens =
    patron.tokens.indexOf(wildcard.id) === -1 // In theory this should ALWAYS be false.
      ? patron.tokens.concat([wildcard.id])
      : patron.tokens;

  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  if (patronOld.id != "NO_OWNER") {
    patronOld.availableDeposit = steward.depositAbleToWithdraw(
      patronOld.address as Address
    );
    let heldUntil = minBigInt(patronOld.foreclosureTime, txTimestamp);

    let timeSinceLastUpdateOldPatron = heldUntil.minus(patronOld.lastUpdated);
    patronOld.totalTimeHeld = patron.totalTimeHeld.plus(
      timeSinceLastUpdateOldPatron.times(
        BigInt.fromI32(patronOld.tokens.length)
      )
    );

    patronOld.totalContributed = patronOld.totalContributed.plus(
      patronOld.patronTokenCostScaledNumerator
        .times(timeSinceLastUpdateOldPatron)
        .div(GLOBAL_PATRONAGE_DENOMINATOR)
        .div(NUM_SECONDS_IN_YEAR_BIG_INT)
    );
    patronOld.lastUpdated = txTimestamp;
    patronOld.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
      patronOld.address as Address
    );
    patronOld.foreclosureTime = getForeclosureTimeSafe(
      steward,
      patronOld.address as Address
    );
  }
  // Remove token to the previous patron's tokens
  patronOld.tokens = removeFromArrayAtIndex(patronOld.tokens, itemIndex);

  patron.save();
  patronOld.save();

  if (wildcard.owner !== "NO_OWNER") {
    let previousPatron = new PreviousPatron(ownerString);
    previousPatron.patron = patron.id;
    previousPatron.timeAcquired = previousTimeWildcardWasAcquired;
    previousPatron.timeSold = event.block.timestamp;
    previousPatron.save();

    // TODO: update the `timeSold` of the previous token.
    wildcard.previousOwners = wildcard.previousOwners.concat([
      previousPatron.id,
    ]);
  }

  let previousPrice = Price.load(wildcard.price);

  let globalState = Global.load("1");

  let tokenPatronageNumerator = steward.patronageNumerator(tokenIdBigInt);
  globalState.totalCollectedAccurate = getTotalCollectedAccurate(steward);
  globalState.totalTokenCostScaledNumeratorAccurate = getTotalTokenCostScaledNumerator(
    steward
  );
  // globalState.totalTokenCostScaledNumerator = globalState.totalTokenCostScaledNumerator
  //   .plus(event.params.price.times(tokenPatronageNumerator))
  //   .minus(previousPrice.price.times(tokenPatronageNumerator));
  let totalOwed = getTotalOwedAccurate(steward);
  globalState.totalCollectedOrDueAccurate = globalState.totalCollectedAccurate.plus(
    totalOwed
  );
  globalState.save();

  let price = new Price(event.transaction.hash.toHexString());
  price.price = event.params.price;
  price.timeSet = txTimestamp;
  price.save();

  wildcard.price = price.id;
  wildcard.patronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );

  wildcard.owner = patron.id;
  wildcard.timeAcquired = txTimestamp;

  wildcard.save();

  let buyEvent = new BuyEvent(event.transaction.hash.toHexString());

  buyEvent.newOwner = patron.id;
  buyEvent.price = price.id;
  buyEvent.token = wildcard.id;
  buyEvent.timestamp = txTimestamp;
  buyEvent.save();

  let eventCounter = EventCounter.load("1");
  eventCounter.buyEventCount = eventCounter.buyEventCount.plus(
    BigInt.fromI32(1)
  );
  eventCounter.buyEvents = eventCounter.buyEvents.concat([buyEvent.id]);
  eventCounter.save();
}

export function handleLogPriceChange(event: LogPriceChange): void {
  // NOTE:: This is a bit hacky since LogBuy event doesn't include token ID.
  //        Get both patrons (since we don't know which one it is - didn't catch this at design time)
  let steward = Steward.bind(event.address);
  let txOrigin = event.transaction.from;
  let txTimestamp = event.block.timestamp;

  let tokenId = getTokenIdFromTxTokenPrice(
    steward,
    event.params.newPrice,
    txOrigin,
    txTimestamp
  );
  if (tokenId == -1) {
    return;
  } // Normally this means a foreclosed token was bought. Will need to fix in future versions!

  // Don't re-add the 'vintage' Vitalik...
  // TODO:: this should be before a given block number - get this block number from when simon buys it!
  let tokenIdString = tokenId.toString();
  let tokenIdBigInt = BigInt.fromI32(tokenId);

  if (isVintageVitalik(tokenIdBigInt, event.block.number)) {
    return;
  } // only continue if it is past the blocknumber that vitalik was migrated to the new smartcontract

  let wildcard = Wildcard.load(tokenIdString);

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(steward, tokenIdBigInt);
  }

  // Entity fields can be set using simple assignments
  wildcard.tokenId = tokenIdBigInt;

  let price = new Price(event.transaction.hash.toHexString());
  price.price = event.params.newPrice;
  price.timeSet = txTimestamp;
  price.save();

  wildcard.price = price.id;
  wildcard.patronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );
  wildcard.save();

  let patron = Patron.load(wildcard.owner);

  let heldUntil = minBigInt(patron.foreclosureTime, txTimestamp);
  let timeSinceLastUpdate = heldUntil.minus(patron.lastUpdated);
  patron.totalContributed = patron.totalContributed.plus(
    patron.patronTokenCostScaledNumerator
      .times(timeSinceLastUpdate)
      .div(GLOBAL_PATRONAGE_DENOMINATOR)
      .div(NUM_SECONDS_IN_YEAR_BIG_INT)
  );
  patron.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    patron.address as Address
  );
  patron.lastUpdated = txTimestamp;
  patron.availableDeposit = steward.depositAbleToWithdraw(
    patron.address as Address
  );
  patron.foreclosureTime = getForeclosureTimeSafe(
    steward,
    patron.address as Address
  );
  patron.save();

  let priceChange = new ChangePriceEvent(event.transaction.hash.toHexString());
  priceChange.price = price.id;
  priceChange.token = wildcard.id;
  priceChange.timestamp = txTimestamp;
  priceChange.save();

  let eventCounter = EventCounter.load("1");
  eventCounter.changePriceEventCount = eventCounter.changePriceEventCount.plus(
    BigInt.fromI32(1)
  );
  eventCounter.save();
}

export function handleLogForeclosure(event: LogForeclosure): void {
  let foreclosedPatron = event.params.prevOwner;
  let blockNumber = event.block.number.toI32();
  // If it is simon foreclosing, and it was at the time that we were fixing the bad migration.
  //      https://etherscan.io/tx/0xc5e2a5de2a49543b1ddf542dbfaf0f537653b91bc8cb0f913d0bc3193ed0cfd4
  //      https://etherscan.io/tx/0x819abe91008e8e22034b57efcff070c26690cbf55b7640bea6f93ffc26184d90
  if (
    foreclosedPatron.toHexString() == SIMON_DLR_ADDRESS &&
    9077422 >= blockNumber &&
    9077272 <= blockNumber
  ) {
    return;
  }
  /**
   * PHASE 1 - load data
   */
  let steward = Steward.bind(event.address);

  updateForeclosedTokens(foreclosedPatron, steward);
}

export function handleLogCollection(event: LogCollection): void {
  let globalState = Global.load("1");
  // let totalTokenCostScaledNumerator = globalState.totalTokenCostScaledNumerator;
  let txTimestamp = event.block.timestamp;

  let steward = Steward.bind(event.address);
  let tokenId = getTokenIdFromTimestamp(steward, txTimestamp);
  if (tokenId == -1) {
    return;
  }
  let tokenIdString = tokenId.toString();
  let tokenIdBigInt = BigInt.fromI32(tokenId);
  if (isVintageVitalik(tokenIdBigInt, event.block.number)) {
    // only continue if it is past the blocknumber that vitalik was migrated to the new smartcontract
    if (
      event.transaction.hash.toHexString() ==
      "0x819abe91008e8e22034b57efcff070c26690cbf55b7640bea6f93ffc26184d90"
    ) {
      // globalState.totalTokenCostScaledNumerator = globalState.totalTokenCostScaledNumerator.plus(
      //   steward
      //     .price(BigInt.fromI32(42))
      //     .times(
      //       VITALIK_PATRONAGE_NUMERATOR /*NOTE: `steward.patronageNumerator(BigInt.fromI32(42))` is incorrect since token was upgraded with a faulty value.*/
      //     )
      // );
    } // This was the transaction that simon upgraded vitalik (so the deposit was updated!)
    else if (
      event.transaction.hash.toHexString() ==
      "0x819abe91008e8e22034b57efcff070c26690cbf55b7640bea6f93ffc26184d90"
    ) {
      let wildcard = Wildcard.load(tokenIdString);
      wildcard.totalCollected = steward.totalCollected(tokenIdBigInt);
      wildcard.timeCollected = txTimestamp;
      wildcard.save();
    } else {
      return;
    }
  }

  let wildcard = Wildcard.load(tokenIdString);

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(steward, tokenIdBigInt);
  }
  wildcard.totalCollected = steward.totalCollected(tokenIdBigInt);
  wildcard.timeCollected = txTimestamp;
  wildcard.save();

  globalState.totalCollected = globalState.totalCollected.plus(
    event.params.collected
  );
  globalState.totalCollectedAccurate = getTotalCollectedAccurate(steward);
  globalState.totalTokenCostScaledNumeratorAccurate = getTotalTokenCostScaledNumerator(
    steward
  );
  let totalOwed = getTotalOwedAccurate(steward);
  globalState.totalCollectedOrDueAccurate = globalState.totalCollectedAccurate.plus(
    totalOwed
  );

  // globalState.totalCollectedOrDue = globalState.totalCollectedOrDue.plus(
  //   totalTokenCostScaledNumerator
  //     .times(txTimestamp.minus(globalState.timeLastCollected))
  //     .div(
  //       steward
  //         .patronageDenominator()
  //         .times(BigInt.fromI32(NUM_SECONDS_IN_YEAR))
  //     )
  // );
  globalState.timeLastCollected = txTimestamp;

  globalState.save();
}

export function handleLogRemainingDepositUpdate(
  event: LogRemainingDepositUpdate
): void {
  let patron = Patron.load(event.params.tokenPatron.toHexString());
  if (patron == null) {
  } else {
    patron.availableDeposit = event.params.remainingDeposit;
    patron.save();
  }
}

export function handleAddToken(event: AddToken): void {
  createCounterIfDoesntExist();

  let tokenId = event.params.tokenId;
  let txTimestamp = event.block.timestamp;

  // Don't re-add the 'vintage' Vitalik...
  if (isVintageVitalik(tokenId, event.block.number)) {
    return;
  } //Temporarily before token is migrated

  let patronageNumerator = event.params.patronageNumerator;

  let wildcard = new Wildcard(tokenId.toString());

  let steward = Steward.bind(event.address);

  let txHashStr = event.transaction.hash.toHexString();

  handleAddTokenUtil(
    tokenId,
    txTimestamp,
    patronageNumerator,
    wildcard,
    steward,
    txHashStr
  );

  let globalState = Global.load("1");

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (globalState == null) {
    globalState = new Global("1");
    globalState.timeLastCollected = txTimestamp;
    globalState.totalCollected = AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT;
    globalState.totalCollectedAccurate = globalState.totalCollected;
    // log.warning("setting global state {} {}", [globalState.totalCollected.toString(), event.transaction.hash.toHexString()])
    // globalState.totalCollectedOrDue = globalState.totalCollected;
    globalState.totalCollectedOrDueAccurate = globalState.totalCollected;
    // globalState.totalTokenCostScaledNumerator = BigInt.fromI32(0);
    globalState.totalTokenCostScaledNumeratorAccurate = BigInt.fromI32(0);
    globalState.save();
  }
}
