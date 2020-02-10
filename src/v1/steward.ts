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
  recognizeStateChange
} from "../util";

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
  let changeType = "handleBuy";
  let currentTimestamp = event.block.timestamp;

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
  }
  patron.lastUpdated = currentTimestamp;

  // Add to previouslyOwnedTokens if not already there
  patron.previouslyOwnedTokens =
    patron.previouslyOwnedTokens.indexOf(wildcard.id) === -1
      ? patron.previouslyOwnedTokens.concat([wildcard.id])
      : patron.previouslyOwnedTokens;
  patron.availableDeposit = steward.depositAbleToWithdraw(owner);
  patron.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    owner
  );
  patron.foreclosureTime = getForeclosureTimeSafe(steward, owner);
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
    patronOld.foreclosureTime = getForeclosureTimeSafe(
      steward,
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

  let price = new Price(txHashString);
  price.price = event.params.price;
  price.timeSet = currentTimestamp;
  price.save();

  wildcard.price = price.id;
  wildcard.patronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );

  wildcard.owner = patron.id;
  wildcard.timeAcquired = currentTimestamp;

  wildcard.save();

  let buyEvent = new BuyEvent(txHashString);

  buyEvent.newOwner = patron.id;
  buyEvent.price = price.id;
  buyEvent.token = wildcard.id;
  buyEvent.timestamp = currentTimestamp;
  buyEvent.save();

  recognizeStateChange(
    txHashString,
    changeType,
    [patronOld.id, patron.id],
    [wildcard.id],
    currentTimestamp
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

  let changeType = "handlePriceChange";
  let currentTimestamp = event.block.timestamp;

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
  price.timeSet = currentTimestamp;
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
  patron.foreclosureTime = getForeclosureTimeSafe(
    steward,
    patron.address as Address
  );
  patron.lastUpdated = currentTimestamp;
  patron.save();

  let priceChange = new ChangePriceEvent(txHashString);
  priceChange.price = price.id;
  priceChange.token = wildcard.id;
  priceChange.timestamp = currentTimestamp;
  priceChange.save();

  recognizeStateChange(
    txHashString,
    changeType,
    [patron.id],
    [wildcard.id],
    currentTimestamp
  );

  let eventCounter = EventCounter.load("1");
  eventCounter.changePriceEventCount = eventCounter.changePriceEventCount.plus(
    BigInt.fromI32(1)
  );
  eventCounter.save();
}
export function handleForeclosure(event: Foreclosure): void {
  let steward = Steward.bind(event.address);
  let tokenPatron = event.params.prevOwner;
  let currentTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();
  let changeType = "handleForeclosure";
  let patron = tokenPatron.toHexString();

  updateAvailableDepositAndForeclosureTime(
    steward,
    tokenPatron,
    currentTimestamp
  );
  recognizeStateChange(
    txHashString,
    changeType,
    [patron],
    [],
    currentTimestamp
  );
}

export function handleRemainingDepositUpdate(
  event: RemainingDepositUpdate
): void {
  let steward = Steward.bind(event.address);
  let tokenPatron = event.params.tokenPatron;
  let currentTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();
  let changeType = "handleRemainingDepositUpdate";
  let patron = tokenPatron.toHexString();

  updateAvailableDepositAndForeclosureTime(
    steward,
    tokenPatron,
    currentTimestamp
  );
  recognizeStateChange(
    txHashString,
    changeType,
    [patron],
    [],
    currentTimestamp
  );
}
export function handleCollectPatronage(event: CollectPatronage): void {
  let steward = Steward.bind(event.address);
  let tokenPatron = event.params.patron;
  let currentTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();
  let changeType = "handleCollectPatronage";
  let patron = tokenPatron.toHexString();

  updateAvailableDepositAndForeclosureTime(
    steward,
    tokenPatron,
    currentTimestamp
  );
  recognizeStateChange(
    txHashString,
    changeType,
    [patron],
    [],
    currentTimestamp
  );
}
