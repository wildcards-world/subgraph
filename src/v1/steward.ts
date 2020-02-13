import { BigInt, Address, EthereumBlock, Bytes } from "@graphprotocol/graph-ts";
import {
  Steward,
  LogBuy,
  LogPriceChange,
  LogForeclosure,
  LogCollection,
  LogRemainingDepositUpdate,
  AddToken,
  BuyCall,
  Buy,
  PriceChange,
  Foreclosure,
  RemainingDepositUpdate,
  CollectPatronage
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
import * as V0 from "../v0/steward";
import {
  updateAvailableDepositAndForeclosureTime,
  getForeclosureTimeSafe,
  getOrInitialiseStateChange,
  recognizeStateChange,
  minBigInt,
  updateGlobalState
} from "../util";
import {
  GLOBAL_PATRONAGE_DENOMINATOR,
  NUM_SECONDS_IN_YEAR_BIG_INT
} from "../CONSTANTS";

export function handleAddToken(event: AddToken): void {
  // No changes from v0:
  V0.handleAddToken(event);
}

export function handleBuy(event: Buy): void {
  let owner = event.params.owner;
  let tokenIdBigInt = event.params.tokenId;
  let tokenIdString = tokenIdBigInt.toString();
  let ownerString = owner.toHexString();
  let txHashString = event.transaction.hash.toHexString();
  let txTimestamp = event.block.timestamp;

  let steward = Steward.bind(event.address);

  let wildcard = Wildcard.load(tokenIdString);

  if (wildcard == null) {
    log.critical("Wildcard didn't exist with id: {} - THIS IS A FATAL ERROR", [
      tokenIdString
    ]);
  }

  // Entity fields can be set using simple assignments
  wildcard.tokenId = tokenIdBigInt;

  wildcard.priceHistory = wildcard.priceHistory.concat([wildcard.price]);

  let previousTokenOwnerString = wildcard.owner;

  let patron = Patron.load(ownerString);
  let patronOld = Patron.load(previousTokenOwnerString);
  if (patron == null) {
    patron = new Patron(ownerString);
    patron.address = owner;
    patron.totalTimeHeld = BigInt.fromI32(0);
    patron.totalContributed = BigInt.fromI32(0);
    patron.tokens = [];
    patron.lastUpdated = txTimestamp;
    patron.foreclosureTime = txTimestamp;
  }

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
  patron.tokens = patron.tokens.concat([wildcard.id]);
  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  if (patronOld.id != "NO_OWNER") {
    let timeSinceLastUpdateOldPatron = txTimestamp.minus(patron.lastUpdated);
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
    patronOld.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
      patronOld.address as Address
    );
    patronOld.lastUpdated = txTimestamp;
    patronOld.availableDeposit = steward.depositAbleToWithdraw(
      patronOld.address as Address
    );
    patronOld.foreclosureTime = getForeclosureTimeSafe(
      steward,
      patronOld.address as Address
    );
  }
  // Remove token to the previous patron's tokens
  patronOld.tokens = patronOld.tokens
    .slice(0, itemIndex)
    .concat(patronOld.tokens.slice(itemIndex + 1, patronOld.tokens.length));

  patron.save();
  patronOld.save();

  if (wildcard.owner !== "NO_OWNER") {
    let previousPatron = new PreviousPatron(ownerString);
    previousPatron.patron = patron.id;
    previousPatron.timeAcquired = wildcard.timeAcquired;
    previousPatron.timeSold = BigInt.fromI32(-1);
    previousPatron.save();

    // TODO: update the `timeSold` of the previous token.
    wildcard.previousOwners = wildcard.previousOwners.concat([
      previousPatron.id
    ]);
  }

  let previousPrice = Price.load(wildcard.price);

  // let globalState = Global.load("1");
  // let tokenPatronageNumerator = steward.patronageNumerator(tokenIdBigInt);

  // globalState.totalTokenCostScaledNumerator = globalState.totalTokenCostScaledNumerator
  //   .plus(event.params.price.times(tokenPatronageNumerator))
  //   .minus(previousPrice.price.times(tokenPatronageNumerator));

  // globalState.save();
  updateGlobalState(steward, txTimestamp);

  let price = new Price(txHashString);
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

  let buyEvent = new BuyEvent(txHashString);

  buyEvent.newOwner = patron.id;
  buyEvent.price = price.id;
  buyEvent.token = wildcard.id;
  buyEvent.timestamp = txTimestamp;
  buyEvent.save();

  recognizeStateChange(
    txHashString,
    "handleBuy",
    [patronOld.id, patron.id],
    [wildcard.id],
    txTimestamp
  );

  let eventCounter = EventCounter.load("1");
  eventCounter.buyEventCount = eventCounter.buyEventCount.plus(
    BigInt.fromI32(1)
  );
  eventCounter.buyEvents = eventCounter.buyEvents.concat([buyEvent.id]);
  eventCounter.save();
}

export function handlePriceChange(event: PriceChange): void {
  let tokenIdBigInt = event.params.tokenId;
  let tokenIdString = tokenIdBigInt.toString();
  let txHashString = event.transaction.hash.toHexString();

  let steward = Steward.bind(event.address);
  let owner = steward.currentPatron(tokenIdBigInt);
  let ownerString = owner.toHexString();
  let txTimestamp = event.block.timestamp;

  let wildcard = Wildcard.load(tokenIdString);

  if (wildcard == null) {
    log.critical("Wildcard didn't exist with id: {} - THIS IS A FATAL ERROR", [
      tokenIdString
    ]);
  }

  // Entity fields can be set using simple assignments
  wildcard.tokenId = tokenIdBigInt;

  let price = new Price(txHashString);
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

  let priceChange = new ChangePriceEvent(txHashString);
  priceChange.price = price.id;
  priceChange.token = wildcard.id;
  priceChange.timestamp = txTimestamp;
  priceChange.save();

  recognizeStateChange(
    txHashString,
    "handlePriceChange",
    [patron.id],
    [wildcard.id],
    txTimestamp
  );

  let eventCounter = EventCounter.load("1");
  eventCounter.changePriceEventCount = eventCounter.changePriceEventCount.plus(
    BigInt.fromI32(1)
  );
  eventCounter.save();

  updateGlobalState(steward, txTimestamp);
}
export function handleForeclosure(event: Foreclosure): void {
  let steward = Steward.bind(event.address);
  let tokenPatron = event.params.prevOwner;
  let txTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();
  let patronString = tokenPatron.toHexString();

  updateAvailableDepositAndForeclosureTime(steward, tokenPatron, txTimestamp);
  recognizeStateChange(
    txHashString,
    "handleForeclosure",
    [patronString],
    [],
    txTimestamp
  );
  updateGlobalState(steward, txTimestamp);
}

export function handleRemainingDepositUpdate(
  event: RemainingDepositUpdate
): void {
  let steward = Steward.bind(event.address);
  let tokenPatron = event.params.tokenPatron;
  let txTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();
  let patronString = tokenPatron.toHexString();

  updateAvailableDepositAndForeclosureTime(steward, tokenPatron, txTimestamp);
  recognizeStateChange(
    txHashString,
    "handleRemainingDepositUpdate",
    [patronString],
    [],
    txTimestamp
  );
  updateGlobalState(steward, txTimestamp);
}
export function handleCollectPatronage(event: CollectPatronage): void {
  let steward = Steward.bind(event.address);
  let tokenPatron = event.params.patron;
  let txTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();
  let patronString = tokenPatron.toHexString();

  updateAvailableDepositAndForeclosureTime(steward, tokenPatron, txTimestamp);
  recognizeStateChange(
    txHashString,
    "handleCollectPatronage",
    [patronString],
    [],
    txTimestamp
  );
  updateGlobalState(steward, txTimestamp);
}
