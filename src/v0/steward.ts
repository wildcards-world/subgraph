import { BigInt, Address } from "@graphprotocol/graph-ts";
import {
  Steward,
  LogBuy,
  LogPriceChange,
  LogForeclosure,
  LogCollection,
  LogRemainingDepositUpdate,
  AddToken
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
  Global
} from "../../generated/schema";
import { Token } from "../../generated/Token/Token";
import { log } from "@graphprotocol/graph-ts";

// TODO: make a file for constants.
const NUM_SECONDS_IN_YEAR = 31536000;
// NOTE: using the bytes string wasn't working well, so this is how we convert 2697680747781582948 into a BigInt
// 2697680747781582948-243264269406392694(the refund given back to Simon due to mistake in smart contract) = 2454416478375190254
// 2000000000 * 1000000000
//  454416478 * 1000000000
//           375190254
let BILLION = BigInt.fromI32(1000000000);
const AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT = BigInt.fromI32(2000000000)
  .times(BILLION)
  .plus(BigInt.fromI32(454416478).times(BILLION))
  .plus(BigInt.fromI32(375190254));

// A token would need to be set to the same price
function getTokenIdFromTxTokenPrice(
  steward: Steward,
  tokenPrice: BigInt,
  owner: Address,
  timestamp: BigInt
): i32 {
  if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(0))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(0))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(0)))
  ) {
    log.warning("We have found a token 1 trade", []);
    return 0;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(1))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(1))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(1)))
  ) {
    return 1;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(2))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(2))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(2)))
  ) {
    return 2;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(3))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(3))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(3)))
  ) {
    return 3;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(4))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(4))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(4)))
  ) {
    return 4;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(5))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(5))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(5)))
  ) {
    return 5;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(6))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(6))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(6)))
  ) {
    return 6;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(7))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(7))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(7)))
  ) {
    return 7;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(8))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(8))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(8)))
  ) {
    return 8;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(9))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(9))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(9)))
  ) {
    return 9;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(10))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(10))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(10)))
  ) {
    return 10;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(11))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(11))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(11)))
  ) {
    return 11;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(12))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(12))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(12)))
  ) {
    return 12;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(42))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(42))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(42)))
  ) {
    return 42;
  } else {
    return -1; // a random non-released token -- this normally means the token was foreclosed or something like that
  }
}
// A token would need to be set to the same price
function getTokenIdFromTimestamp(steward: Steward, timestamp: BigInt): i32 {
  // NOTE: this code is broken for token foreclosures!
  if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(0)))) {
    log.warning("0 - was just collected", []);
    return 0;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(1)))) {
    log.warning("1 - was just collected", []);
    return 1;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(2)))) {
    log.warning("2 - was just collected", []);
    return 2;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(3)))) {
    log.warning("3 - was just collected", []);
    return 3;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(4)))) {
    log.warning("4 - was just collected", []);
    return 4;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(5)))) {
    log.warning("5 - was just collected", []);
    return 5;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(6)))) {
    log.warning("6 - was just collected", []);
    return 6;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(7)))) {
    log.warning("7 - was just collected", []);
    return 7;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(8)))) {
    log.warning("8 - was just collected", []);
    return 8;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(9)))) {
    log.warning("9 - was just collected", []);
    return 9;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(10)))) {
    log.warning("10 - was just collected", []);
    return 10;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(11)))) {
    log.warning("11 - was just collected", []);
    return 11;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(12)))) {
    log.warning("12 - was just collected", []);
    return 12;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(42)))) {
    log.warning("42 - was just collected", []);
    return 42;
  } else {
    return -1; // a random non-released token -- this normally means the token was foreclosed or something like that
  }
}

function isVintageVitalik(tokenId: BigInt, blockNumber: BigInt): boolean {
  return (
    tokenId.equals(BigInt.fromI32(42)) &&
    blockNumber.lt(BigInt.fromI32(9077429))
  ); // block 9077422 is the block that Vitalik was mined at.
}

function createCounterIfDoesntExist(): void {
  let eventCounter = EventCounter.load("1");
  if (eventCounter != null) {
    // if eventCounter has already been created return it
    return;
  }
  eventCounter = new EventCounter("1");
  eventCounter.buyEventCount = BigInt.fromI32(0);
  eventCounter.changePriceEventCount = BigInt.fromI32(0);
  eventCounter.buyEvents = [];
  eventCounter.save();
}
function createWildcardIfDoesntExist(
  steward: Steward,
  tokenId: BigInt
): Wildcard {
  let wildcard = new Wildcard(tokenId.toString());

  let tokenAddress = steward.assetToken();
  let erc721 = Token.bind(tokenAddress);

  let tokenInfo = erc721.tokenURI(tokenId);

  // Entity fields can be set using simple assignments
  let tokenUri = new TokenUri(tokenId.toString());
  tokenUri.uriString = tokenInfo;
  tokenUri.save();

  wildcard.tokenUri = tokenUri.id;
  return wildcard;
}

function getTotalCollectedAccurate(steward: Steward): BigInt {
  return AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT.plus(
    steward.totalCollected(BigInt.fromI32(0))
  )
    .plus(steward.totalCollected(BigInt.fromI32(1)))
    .plus(steward.totalCollected(BigInt.fromI32(2)))
    .plus(steward.totalCollected(BigInt.fromI32(3)))
    .plus(steward.totalCollected(BigInt.fromI32(4)))
    .plus(steward.totalCollected(BigInt.fromI32(5)))
    .plus(steward.totalCollected(BigInt.fromI32(6)))
    .plus(steward.totalCollected(BigInt.fromI32(7)))
    .plus(steward.totalCollected(BigInt.fromI32(9)))
    .plus(steward.totalCollected(BigInt.fromI32(10)))
    .plus(steward.totalCollected(BigInt.fromI32(11)))
    .plus(steward.totalCollected(BigInt.fromI32(12)))
    .plus(steward.totalCollected(BigInt.fromI32(42)));
}
function getTotalOwedAccurate(steward: Steward): BigInt {
  return steward
    .patronageOwed(BigInt.fromI32(0))
    .plus(steward.patronageOwed(BigInt.fromI32(1)))
    .plus(steward.patronageOwed(BigInt.fromI32(2)))
    .plus(steward.patronageOwed(BigInt.fromI32(3)))
    .plus(steward.patronageOwed(BigInt.fromI32(4)))
    .plus(steward.patronageOwed(BigInt.fromI32(5)))
    .plus(steward.patronageOwed(BigInt.fromI32(6)))
    .plus(steward.patronageOwed(BigInt.fromI32(7)))
    .plus(steward.patronageOwed(BigInt.fromI32(9)))
    .plus(steward.patronageOwed(BigInt.fromI32(10)))
    .plus(steward.patronageOwed(BigInt.fromI32(11)))
    .plus(steward.patronageOwed(BigInt.fromI32(12)))
    .plus(steward.patronageOwed(BigInt.fromI32(42)));
}
function getTotalTokenCostScaledNumerator(steward: Steward): BigInt {
  return steward
    .patronageNumerator(BigInt.fromI32(0))
    .times(steward.price(BigInt.fromI32(0)))
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(1))
        .times(steward.price(BigInt.fromI32(1)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(2))
        .times(steward.price(BigInt.fromI32(2)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(3))
        .times(steward.price(BigInt.fromI32(3)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(4))
        .times(steward.price(BigInt.fromI32(4)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(5))
        .times(steward.price(BigInt.fromI32(5)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(6))
        .times(steward.price(BigInt.fromI32(6)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(7))
        .times(steward.price(BigInt.fromI32(7)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(9))
        .times(steward.price(BigInt.fromI32(9)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(10))
        .times(steward.price(BigInt.fromI32(10)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(11))
        .times(steward.price(BigInt.fromI32(11)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(12))
        .times(steward.price(BigInt.fromI32(12)))
    )
    .plus(
      BigInt.fromI32(300)
        .times(BigInt.fromI32(1000000000))
        .times(steward.price(BigInt.fromI32(42)))
    );
  // .plus(steward.patronageNumerator(BigInt.fromI32(42)).times(steward.price(BigInt.fromI32(42))))
}

// TODO:: check on every block header if there are any foreclosures or do other updates to data. See how feasible this is.
export function handleLogBuy(event: LogBuy): void {
  let owner = event.params.owner;
  let ownerString = owner.toHexString();

  // NOTE:: This is a bit hacky since LogBuy event doesn't include token ID.
  //        Get both patrons (since we don't know which one it is - didn't catch this at design time)
  let steward = Steward.bind(event.address);
  let tokenId = getTokenIdFromTxTokenPrice(
    steward,
    event.params.price,
    owner,
    event.block.timestamp
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
      let patron = Patron.load(ownerString);
      patron.availableDeposit = steward.depositAbleToWithdraw(owner);
      patron.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
        owner
      );
      patron.foreclosureTime = steward.foreclosureTimePatron(owner);
      patron.lastUpdated = event.block.timestamp;
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

  // Entity fields can be set using simple assignments
  wildcard.tokenId = BigInt.fromI32(tokenId);

  wildcard.priceHistory = wildcard.priceHistory.concat([wildcard.price]);

  let previousTokenOwnerString = wildcard.owner;

  let patron = Patron.load(ownerString);
  let patronOld = Patron.load(previousTokenOwnerString);
  if (patron == null) {
    patron = new Patron(ownerString);
    patron.address = owner;
  }
  patron.lastUpdated = event.block.timestamp;

  // Add to previouslyOwnedTokens if not already there
  patron.previouslyOwnedTokens =
    patron.previouslyOwnedTokens.indexOf(wildcard.id) === -1
      ? patron.previouslyOwnedTokens.concat([wildcard.id])
      : patron.previouslyOwnedTokens;
  patron.availableDeposit = steward.depositAbleToWithdraw(owner);
  patron.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    owner
  );
  patron.foreclosureTime = steward.foreclosureTimePatron(owner);
  // Add token to the patrons currently held tokens
  patron.tokens = patron.tokens.concat([wildcard.id]);
  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  // Remove token to the previous patron's tokens
  patronOld.tokens = patronOld.tokens
    .slice(0, itemIndex)
    .concat(patronOld.tokens.slice(itemIndex + 1, patronOld.tokens.length));
  if (patronOld.id != "NO_OWNER") {
    patronOld.availableDeposit = steward.depositAbleToWithdraw(
      patronOld.address as Address
    );
    patronOld.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
      patronOld.address as Address
    );
  }

  patron.save();
  patronOld.save();

  if (wildcard.owner !== "NO_OWNER") {
    let previousPatron = new PreviousPatron(ownerString);
    previousPatron.patron = patron.id;
    previousPatron.timeAcquired = wildcard.timeAcquired;
    previousPatron.timeSold = BigInt.fromI32(-1); //event.block.timestamp;
    previousPatron.save();

    // TODO: update the `timeSold` of the previous token.
    wildcard.previousOwners = wildcard.previousOwners.concat([
      previousPatron.id
    ]);
  }

  let previousPrice = Price.load(wildcard.price);

  let globalState = Global.load("1");

  let tokenPatronageNumerator = steward.patronageNumerator(tokenIdBigInt);
  globalState.totalTokenCostScaledNumerator = globalState.totalTokenCostScaledNumerator
    .plus(event.params.price.times(tokenPatronageNumerator))
    .minus(previousPrice.price.times(tokenPatronageNumerator));
  globalState.save();

  let price = new Price(event.transaction.hash.toHexString());
  price.price = event.params.price;
  price.timeSet = event.block.timestamp;
  price.save();

  wildcard.price = price.id;
  wildcard.patronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );

  wildcard.owner = patron.id;
  wildcard.timeAcquired = event.block.timestamp;

  wildcard.save();

  let buyEvent = new BuyEvent(event.transaction.hash.toHexString());

  buyEvent.newOwner = patron.id;
  buyEvent.price = price.id;
  buyEvent.token = wildcard.id;
  buyEvent.timestamp = event.block.timestamp;
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
  let tokenId = getTokenIdFromTxTokenPrice(
    steward,
    event.params.newPrice,
    txOrigin,
    event.block.timestamp
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
  price.timeSet = event.block.timestamp;
  price.save();

  wildcard.price = price.id;
  wildcard.patronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );
  wildcard.save();

  let patron = Patron.load(wildcard.owner);

  // Add to previouslyOwnedTokens if not already there
  patron.availableDeposit = steward.depositAbleToWithdraw(
    patron.address as Address
  );
  patron.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    patron.address as Address
  );
  patron.foreclosureTime = steward.foreclosureTimePatron(
    patron.address as Address
  );
  patron.lastUpdated = event.block.timestamp;
  patron.save();

  let priceChange = new ChangePriceEvent(event.transaction.hash.toHexString());
  priceChange.price = price.id;
  priceChange.token = wildcard.id;
  priceChange.timestamp = event.block.timestamp;
  priceChange.save();

  let eventCounter = EventCounter.load("1");
  eventCounter.changePriceEventCount = eventCounter.changePriceEventCount.plus(
    BigInt.fromI32(1)
  );
  eventCounter.save();
}

export function handleLogForeclosure(event: LogForeclosure): void {
  // TODO!
}

export function handleLogCollection(event: LogCollection): void {
  let globalState = Global.load("1");
  let totalTokenCostScaledNumerator = globalState.totalTokenCostScaledNumerator;

  let steward = Steward.bind(event.address);
  let tokenId = getTokenIdFromTimestamp(steward, event.block.timestamp);
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
      globalState.totalTokenCostScaledNumerator = globalState.totalTokenCostScaledNumerator.plus(
        steward
          .price(BigInt.fromI32(42))
          .times(
            BigInt.fromI32(300).times(
              BigInt.fromI32(1000000000)
            ) /*steward.patronageNumerator(BigInt.fromI32(42))*/
          )
      );
    } // This was the transaction that simon upgraded vitalik (so the deposit was updated!)
    else if (
      event.transaction.hash.toHexString() ==
      "0x819abe91008e8e22034b57efcff070c26690cbf55b7640bea6f93ffc26184d90"
    ) {
      let wildcard = Wildcard.load(tokenIdString);
      wildcard.totalCollected = steward.totalCollected(tokenIdBigInt);
      wildcard.timeCollected = event.block.timestamp;
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
  wildcard.timeCollected = event.block.timestamp;
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

  let now = event.block.timestamp;
  globalState.totalCollectedOrDue = globalState.totalCollectedOrDue.plus(
    totalTokenCostScaledNumerator
      .times(now.minus(globalState.timeLastCollected))
      .div(
        steward
          .patronageDenominator()
          .times(BigInt.fromI32(NUM_SECONDS_IN_YEAR))
      )
  );
  globalState.timeLastCollected = event.block.timestamp;

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
  // Don't re-add the 'vintage' Vitalik...
  if (isVintageVitalik(tokenId, event.block.number)) {
    return;
  } //Temporarily before token is migrated

  let patronageNumerator = event.params.patronageNumerator;

  let wildcard = new Wildcard(tokenId.toString());

  let steward = Steward.bind(event.address);

  let tokenAddress = steward.assetToken();
  let erc721 = Token.bind(tokenAddress);

  let tokenInfo = erc721.tokenURI(tokenId);

  // Entity fields can be set using simple assignments
  let tokenUri = new TokenUri(tokenId.toString());
  tokenUri.uriString = tokenInfo;
  tokenUri.save();

  wildcard.tokenUri = tokenUri.id;
  wildcard.tokenId = tokenId;
  wildcard.totalCollected = BigInt.fromI32(0);
  wildcard.timeCollected = event.block.timestamp;

  let price = new Price(event.transaction.hash.toHexString());
  price.price = BigInt.fromI32(0);
  price.timeSet = event.block.timestamp;
  price.save();

  let patron = Patron.load("NO_OWNER");
  if (patron == null) {
    patron = new Patron("NO_OWNER");
    patron.address = Address.fromString(
      "0x0000000000000000000000000000000000000000"
    );
    patron.lastUpdated = BigInt.fromI32(0);
    patron.availableDeposit = BigInt.fromI32(0);
    patron.patronTokenCostScaledNumerator = BigInt.fromI32(0);
    patron.foreclosureTime = BigInt.fromI32(0);
    patron.save();
  }

  wildcard.price = price.id;
  wildcard.owner = patron.id;
  wildcard.patronageNumerator = patronageNumerator;
  wildcard.patronageNumeratorPriceScaled = BigInt.fromI32(0);
  wildcard.timeAcquired = event.block.timestamp;
  wildcard.previousOwners = [];

  wildcard.save();

  let globalState = Global.load("1");

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (globalState == null) {
    globalState = new Global("1");
    globalState.timeLastCollected = event.block.timestamp;
    globalState.totalCollected = AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT;
    globalState.totalCollectedAccurate = globalState.totalCollected;
    // log.warning("setting global state {} {}", [globalState.totalCollected.toString(), event.transaction.hash.toHexString()])
    globalState.totalCollectedOrDue = globalState.totalCollected;
    globalState.totalCollectedOrDueAccurate = globalState.totalCollected;
    globalState.totalTokenCostScaledNumerator = BigInt.fromI32(0);
    globalState.totalTokenCostScaledNumeratorAccurate = BigInt.fromI32(0);
    globalState.save();
  }
}
