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
  NO_OWNER,
  GLOBAL_ID,
  EVENT_COUNTER_ID,
  ID_PREFIX,
  network,
  ZERO_BN,
} from "../CONSTANTS";
import {
  getForeclosureTimeSafe,
  minBigInt,
  updateForeclosedTokens,
  removeFromArrayAtIndex,
  handleAddTokenUtil,
  getTotalCollectedForWildcard,
  initialiseDefaultPatronIfNull,
  warnAndError,
  saveEventToStateChange,
} from "../util";
import {
  getTotalCollectedAccurate,
  getTotalOwedAccurate,
  getTotalTokenCostScaledNumerator,
} from "../util/hacky";
import {
  handleVitalikUpgradeLogic,
  isVintageVitalik,
  isVintageVitalikUpgradeTx,
} from "./vitalikHandlers";
import {
  getTokenIdFromTxTokenPrice,
  createWildcardIfDoesntExist,
  getTokenIdFromTimestamp,
  createCounterIfDoesntExist,
} from "./helpers";

// TODO:: check on every block header if there are any foreclosures or do other updates to data. See how feasible this is.
export function handleLogBuy(event: LogBuy): void {
  // PART 1: reading and getting values.
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
    txTimestamp,
    event.transaction.hash
  );

  let txHashString = event.transaction.hash.toHexString();

  if (tokenId == -1) {
    // Normal ly this means a foreclosed token was bought. Will need to fix in future versions of the smart contracts! This should be accounted for (thus throwing the error)
    warnAndError("Undefined token on transaction hash {}", [
      event.transaction.hash.toHexString(),
    ]);
  }
  let tokenIdString = tokenId.toString();
  let tokenIdBigInt = BigInt.fromI32(tokenId);

  let wildcard = Wildcard.load(ID_PREFIX + tokenIdString);
  if (wildcard == null) {
    warnAndError(
      "The wildcard doesn't exist. Check the 'addToken' logic. token: {} tx: {}",
      [tokenIdString, event.transaction.hash.toHexString()]
    );
  }

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(steward, tokenIdBigInt, txTimestamp);
  }

  let previousTimeWildcardWasAcquired = wildcard.timeAcquired;

  // Entity fields can be set using simple assignments
  wildcard.tokenId = BigInt.fromI32(tokenId);

  wildcard.priceHistory = wildcard.priceHistory.concat([wildcard.price]);

  let previousTokenOwnerString = wildcard.owner;
  let previousTokenOwner =
    previousTokenOwnerString != ID_PREFIX + NO_OWNER
      ? Address.fromString(previousTokenOwnerString)
      : ZERO_ADDRESS;

  let patron = Patron.load(ID_PREFIX + ownerString);
  if (patron == null) {
    patron = initialiseDefaultPatronIfNull(steward, owner, txTimestamp);
  }

  let patronOld = Patron.load(ID_PREFIX + previousTokenOwnerString);
  if (patronOld == null) {
    warnAndError("The previous patron should be defined. tx: {}", [
      event.transaction.hash.toHexString(),
    ]);
  }

  // Phase 2: calculate new values.
  // patron.lastUpdated = txTimestamp;
  if (
    isVintageVitalik(tokenIdBigInt, event.block.number) &&
    network != "ganache"
  ) {
    if (isVintageVitalikUpgradeTx(event.transaction.hash)) {
      // TODO: check functionality from rewrite
      handleVitalikUpgradeLogic(steward, tokenIdBigInt, owner, txTimestamp);
    }
    return;
  }

  // TODO: Investigate, what if multiple tokens foreclose at the same time?
  let patronForeclosureTime = getForeclosureTimeSafe(steward, owner);
  let patronOldForeclosureTime = getForeclosureTimeSafe(
    steward,
    previousTokenOwner
  );

  // Now even if the patron puts in extra deposit when they buy a new token this will foreclose their old tokens.
  let heldUntilNewPatron = minBigInt(patronForeclosureTime, txTimestamp);
  let heldUntilPreviousPatron = minBigInt(
    patronOldForeclosureTime,
    txTimestamp
  );

  let timeSinceLastUpdatePatron = heldUntilNewPatron.minus(patron.lastUpdated);
  let timeSinceLastUpdatePreviousPatron = heldUntilPreviousPatron.minus(
    patronOld.lastUpdated
  );

  let newPatronTotalTimeHeld =
    patron.id != ID_PREFIX + "NO_OWNER"
      ? patron.totalTimeHeld.plus(
          timeSinceLastUpdatePatron.times(BigInt.fromI32(patron.tokens.length))
        )
      : BigInt.fromI32(0);

  let oldPatronTotalTimeHeld =
    patronOld.id != ID_PREFIX + "NO_OWNER"
      ? patronOld.totalTimeHeld.plus(
          timeSinceLastUpdatePreviousPatron.times(
            BigInt.fromI32(patronOld.tokens.length)
          )
        )
      : BigInt.fromI32(0);

  // Now even if the patron puts in extra deposit when they buy a new token this will do the calculation as if it forecloses their old tokens.
  let newPatronTotalContributed =
    patronOld.id != ID_PREFIX + "NO_OWNER"
      ? patron.totalContributed.plus(
          patron.patronTokenCostScaledNumerator
            .times(timeSinceLastUpdatePatron)
            .div(GLOBAL_PATRONAGE_DENOMINATOR)
            .div(NUM_SECONDS_IN_YEAR_BIG_INT)
        )
      : BigInt.fromI32(0);
  let newPatronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    owner
  );
  let oldPatronTotalContributed =
    patronOld.id != ID_PREFIX + "NO_OWNER"
      ? patronOld.totalContributed.plus(
          patronOld.patronTokenCostScaledNumerator
            .times(timeSinceLastUpdatePatron)
            .div(GLOBAL_PATRONAGE_DENOMINATOR)
            .div(NUM_SECONDS_IN_YEAR_BIG_INT)
        )
      : BigInt.fromI32(0);
  let oldPatronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    owner
  );

  // Add token to the patrons currently held tokens
  let newPatronTokenArray =
    patron.tokens.indexOf(wildcard.id) === -1 // In theory this should ALWAYS be false.
      ? patron.tokens.concat([wildcard.id])
      : patron.tokens;

  // Add to previouslyOwnedTokens if not already there
  let newPatronPreviouslyOwnedTokenArray =
    patron.previouslyOwnedTokens.indexOf(wildcard.id) === -1
      ? patron.previouslyOwnedTokens.concat([wildcard.id])
      : patron.previouslyOwnedTokens;

  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  let oldPatronTokenArray = removeFromArrayAtIndex(patronOld.tokens, itemIndex);

  let timePatronLastUpdated = steward.timeLastCollectedPatron(owner);
  let timePatronOldLastUpdated = steward.timeLastCollectedPatron(
    previousTokenOwner
  );

  let newPatronDepositAbleToWithdraw = steward.depositAbleToWithdraw(owner);
  let oldPatronDepositAbleToWithdraw = steward.depositAbleToWithdraw(
    previousTokenOwner
  );

  // TODO: there should be a difference between `timeSold` and forclosure time if token gets foreclosed.
  let wildcardPreviousOwners = wildcard.previousOwners;
  if (wildcard.owner !== ID_PREFIX + "NO_OWNER") {
    let previousPatron = new PreviousPatron(ownerString);
    previousPatron.patron = patron.id;
    previousPatron.timeAcquired = previousTimeWildcardWasAcquired;
    previousPatron.timeSold = event.block.timestamp;
    previousPatron.save();

    wildcardPreviousOwners = wildcard.previousOwners.concat([
      previousPatron.id,
    ]);
  }

  let globalState = Global.load(GLOBAL_ID);

  let globalStateTotalTokenCostScaledNumeratorAccurate = getTotalTokenCostScaledNumerator(
    steward,
    BigInt.fromI32(0)
  );
  let globalStateTotalCollectedAccurate = getTotalCollectedAccurate(
    steward,
    globalStateTotalTokenCostScaledNumeratorAccurate,
    txTimestamp
  );
  // let previousPrice = Price.load(wildcard.price);
  // globalState.totalTokenCostScaledNumerator = globalState.totalTokenCostScaledNumerator
  //   .plus(event.params.price.times(tokenPatronageNumerator))
  //   .minus(previousPrice.price.times(tokenPatronageNumerator));
  let totalOwed = getTotalOwedAccurate(steward);
  let globalStateTotalCollectedOrDueAccurate = globalState.totalCollectedAccurate.plus(
    totalOwed
  );

  let price = new Price(event.transaction.hash.toHexString());
  price.price = event.params.price;
  price.timeSet = txTimestamp;
  price.save();

  let wildcardPrice = price.id;
  let wildcardPatronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );

  let wildcardOwner = patron.id;
  let wildcardTimeAcquired = txTimestamp;

  let eventParamValues: Array<string> = [
    tokenIdString,
    event.params.owner.toHexString(),
    event.params.price.toString(),
  ];
  let eventParamNames: Array<string> = ["tokenid", "owner", "price"];

  let eventParamTypes: Array<string> = ["uint256", "address", "uint256"];

  saveEventToStateChange(
    event.transaction.hash,
    txTimestamp,
    event.block.number,
    "Buy",
    eventParamValues,
    eventParamNames,
    eventParamTypes,
    [patronOld.id, patron.id],
    [wildcard.id],
    0
  );

  // Phase 3: set+save values.

  patron.lastUpdated = timePatronLastUpdated;
  patron.totalTimeHeld = newPatronTotalTimeHeld;
  patron.tokens = newPatronTokenArray;
  patron.availableDeposit = newPatronDepositAbleToWithdraw;
  patron.previouslyOwnedTokens = newPatronPreviouslyOwnedTokenArray;
  patron.patronTokenCostScaledNumerator = newPatronTokenCostScaledNumerator;

  if (patron.availableDeposit.gt(ZERO_BN)) {
    patron.effectivePatronTokenCostScaledNumerator = patron.patronTokenCostScaledNumerator;	
  } else {
   patron.effectivePatronTokenCostScaledNumerator = ZERO_BN;
  } 

  patron.foreclosureTime = patronForeclosureTime;

  patron.totalContributed = newPatronTotalContributed;
  patron.save();

  if (patronOld.id != ID_PREFIX + "NO_OWNER") {
    patronOld.lastUpdated = timePatronOldLastUpdated;
    patronOld.totalTimeHeld = oldPatronTotalTimeHeld;
    patronOld.tokens = oldPatronTokenArray;
    patronOld.availableDeposit = oldPatronDepositAbleToWithdraw;
    patronOld.patronTokenCostScaledNumerator = oldPatronTokenCostScaledNumerator;
    patronOld.totalContributed = oldPatronTotalContributed;
    patronOld.foreclosureTime = patronOldForeclosureTime;
    patronOld.save();
  }

  wildcard.previousOwners = wildcardPreviousOwners;
  wildcard.owner = ownerString;
  wildcard.price = wildcardPrice;
  wildcard.currPrice = price.price;
  wildcard.patronageNumeratorPriceScaled = wildcardPatronageNumeratorPriceScaled;
  wildcard.owner = wildcardOwner;
  wildcard.timeAcquired = wildcardTimeAcquired;
  wildcard.save();

  globalState.totalCollectedAccurate = globalStateTotalCollectedAccurate;
  globalState.totalTokenCostScaledNumeratorAccurate = globalStateTotalTokenCostScaledNumeratorAccurate;
  globalState.totalCollectedOrDueAccurate = globalStateTotalCollectedOrDueAccurate;
  globalState.save();

  // TODO: deprecate the below code: rather rely on "recognize state change"
  let buyEvent = new BuyEvent(event.transaction.hash.toHexString());
  buyEvent.newOwner = patron.id;
  buyEvent.price = price.id;
  buyEvent.token = wildcard.id;
  buyEvent.timestamp = txTimestamp;
  buyEvent.save();

  let eventCounter = EventCounter.load(EVENT_COUNTER_ID);
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
    txTimestamp,
    event.transaction.hash
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

  let wildcard = Wildcard.load(ID_PREFIX + tokenIdString);

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(steward, tokenIdBigInt, txTimestamp);
  }

  // Entity fields can be set using simple assignments
  wildcard.tokenId = tokenIdBigInt;

  let price = new Price(event.transaction.hash.toHexString());
  price.price = event.params.newPrice;
  price.timeSet = txTimestamp;
  price.save();

  wildcard.price = price.id;
  wildcard.currPrice = price.price;
  wildcard.patronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );
  wildcard.save();

  let patron = Patron.load(ID_PREFIX + wildcard.owner);

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

  if (patron.availableDeposit.gt(ZERO_BN)) {
    patron.effectivePatronTokenCostScaledNumerator = patron.patronTokenCostScaledNumerator;	
  } else {
   patron.effectivePatronTokenCostScaledNumerator = ZERO_BN;
  } 

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

  let eventCounter = EventCounter.load(EVENT_COUNTER_ID);
  eventCounter.changePriceEventCount = eventCounter.changePriceEventCount.plus(
    BigInt.fromI32(1)
  );
  eventCounter.save();

  let txHashString = event.transaction.hash.toHexString();

  let eventParamValues: Array<string> = [
    tokenIdString,
    event.params.newPrice.toString(),
  ];

  let eventParamNames: Array<string> = ["tokenid", "newPrice"];

  let eventParamTypes: Array<string> = ["uint256", "uint256"];

  saveEventToStateChange(
    event.transaction.hash,
    txTimestamp,
    event.block.number,
    "PriceChange",
    eventParamValues,
    eventParamNames,
    eventParamTypes,
    [patron.id],
    [wildcard.id],
    0
  );
}

export function handleLogForeclosure(event: LogForeclosure): void {
  let foreclosedPatron = event.params.prevOwner;
  let blockNumber = event.block.number.toI32();
  let txTimestamp = event.block.timestamp;
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

  let changedTokens = updateForeclosedTokens(foreclosedPatron, steward);

  let txHashString = event.transaction.hash.toHexString();

  let eventParamValues: Array<string> = [event.params.prevOwner.toString()];

  let eventParamNames: Array<string> = ["prevOwner"];

  let eventParamTypes: Array<string> = ["address"];

  saveEventToStateChange(
    event.transaction.hash,
    txTimestamp,
    event.block.number,
    "Foreclosure",
    eventParamValues,
    eventParamNames,
    eventParamTypes,
    [event.params.prevOwner.toString()],
    changedTokens,
    0
  );
}

export function handleLogCollection(event: LogCollection): void {
  let globalState = Global.load(GLOBAL_ID);
  // let totalTokenCostScaledNumerator = globalState.totalTokenCostScaledNumerator;
  let txTimestamp = event.block.timestamp;

  let steward = Steward.bind(event.address);
  let tokenId = getTokenIdFromTimestamp(
    steward,
    txTimestamp,
    event.transaction.hash
  );
  if (tokenId == -1) {
    log.critical("This token could not be found. Transaction hash: {}", [
      event.block.hash.toHexString(),
    ]);
  }

  let tokenIdString = tokenId.toString();
  let tokenIdBigInt = BigInt.fromI32(tokenId);
  if (isVintageVitalik(tokenIdBigInt, event.block.number)) {
    // only continue if it is past the blocknumber that vitalik was migrated to the new smartcontract
    if (
      event.transaction.hash.toHexString() ==
      "0x819abe91008e8e22034b57efcff070c26690cbf55b7640bea6f93ffc26184d90"
    ) {
      // This was the transaction that simon upgraded vitalik (so the deposit was updated!)
      // NOTE: there was an error on upgrading that set the token price to 20000000.. ETH instead of 20.
      //       so although there were a few transactions to fix this problem, all of them should be ignored.
    } else {
      return;
    }
  }

  let wildcard = Wildcard.load(ID_PREFIX + tokenIdString);

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(steward, tokenIdBigInt, txTimestamp);
  }
  wildcard.totalCollected = getTotalCollectedForWildcard(
    steward,
    tokenIdBigInt,
    event.block.timestamp.minus(wildcard.timeCollected)
  );
  wildcard.timeCollected = txTimestamp;
  wildcard.save();

  globalState.totalCollected = globalState.totalCollected.plus(
    event.params.collected
  );
  let totalTokenCostScaledNumeratorAccurate = getTotalTokenCostScaledNumerator(
    steward,
    BigInt.fromI32(0)
  );
  globalState.totalCollectedAccurate = getTotalCollectedAccurate(
    steward,
    totalTokenCostScaledNumeratorAccurate,
    txTimestamp
  );
  globalState.totalTokenCostScaledNumeratorAccurate = totalTokenCostScaledNumeratorAccurate;
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

  let eventParamValues: Array<string> = [
    tokenIdString,
    event.params.collected.toString(),
  ];
  let eventParamNames: Array<string> = ["tokenid", "collected"];

  let eventParamTypes: Array<string> = ["uint256", "uint256"];

  saveEventToStateChange(
    event.transaction.hash,
    txTimestamp,
    event.block.number,
    "CollectPatronage",
    eventParamValues,
    eventParamNames,
    eventParamTypes,
    [wildcard.owner],
    [],
    0
  );
}

export function handleLogRemainingDepositUpdate(
  event: LogRemainingDepositUpdate
): void {
  let patron = Patron.load(ID_PREFIX + event.params.tokenPatron.toHexString());
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
    // If the vitalik doesn't exist then continue adding it (eg. relevant for a test environment)
    let token = Wildcard.load(tokenId.toString());
    if (token != null) {
      return;
    }
  } //Temporarily before token is migrated

  let patronageNumerator = event.params.patronageNumerator;

  let wildcard = new Wildcard(ID_PREFIX + tokenId.toString());
  wildcard.launchTime = txTimestamp;

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

  let globalState = Global.load(GLOBAL_ID);

  if (globalState == null) {
    log.critical("The global state should be defined", []);
  }
  if (globalState.stewardAddress.equals(ZERO_ADDRESS)) {
    globalState.stewardAddress = event.address;
    globalState.save();
  }
}
