import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
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
  CollectPatronage,
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
import * as V0 from "../v0/steward";
import {
  updateAvailableDepositAndForeclosureTime,
  getForeclosureTimeSafe,
  getOrInitialiseStateChange,
  recognizeStateChange,
  minBigInt,
  updateGlobalState,
  updateForeclosedTokens,
  removeFromArrayAtIndex,
  updateAllOfPatronsTokensLastUpdated,
  getTotalCollectedForWildcard,
  timeLastCollectedWildcardSafe,
} from "../util";
import {
  GLOBAL_PATRONAGE_DENOMINATOR,
  NUM_SECONDS_IN_YEAR_BIG_INT,
} from "../CONSTANTS";

export function handleAddToken(event: AddToken): void {
  // No changes from v0:
  V0.handleAddToken(event);
}

export function handleBuy(event: Buy): void {
  // PART 1: reading and getting values.
  let owner = event.params.owner;
  let ownerString = owner.toHexString();
  let txTimestamp = event.block.timestamp;

  let steward = Steward.bind(event.address);
  let tokenIdBigInt = event.params.tokenId;
  let tokenIdString = tokenIdBigInt.toString();

  let wildcard = Wildcard.load(tokenIdString);
  if (wildcard == null) {
    log.critical("Wildcard didn't exist with id: {} - THIS IS A FATAL ERROR", [
      tokenIdString,
    ]);
  }

  let previousTokenOwner = wildcard.owner;
  let patronOld = Patron.load(previousTokenOwner);
  if (patronOld == null) {
    log.critical("Patron didn't exist with id: {} - THIS IS A FATAL ERROR", [
      previousTokenOwner,
    ]);
  }

  /// OTHER CODE
  let txHashString = event.transaction.hash.toHexString();

  let previousTimeWildcardWasAcquired = wildcard.timeAcquired;

  // Entity fields can be set using simple assignments
  wildcard.tokenId = tokenIdBigInt;

  wildcard.priceHistory = wildcard.priceHistory.concat([wildcard.price]);
  log.warning("Before time collected... {}", [
    event.transaction.hash.toHexString(),
  ]);
  wildcard.timeCollected = timeLastCollectedWildcardSafe(
    steward,
    tokenIdBigInt
  );
  log.warning("Before time collected...", []);

  let previousTokenOwnerString = wildcard.owner;

  let patron = Patron.load(ownerString);
  // let patronOld = Patron.load(previousTokenOwnerString);
  if (patron == null) {
    patron = new Patron(ownerString);
    patron.address = owner;
    patron.totalTimeHeld = BigInt.fromI32(0);
    patron.totalContributed = BigInt.fromI32(0);
    patron.tokens = [];
    patron.previouslyOwnedTokens = [];
    patron.lastUpdated = txTimestamp;
    patron.foreclosureTime = txTimestamp;
    patron.totalLoyaltyTokens = BigInt.fromI32(0);
    patron.totalLoyaltyTokensIncludingUnRedeemed = BigInt.fromI32(0);
    patron.currentBalance = BigInt.fromI32(0);
  }

  // Phase 2: calculate new values.

  /*
  VALUES WE NEED FROM THIS PHASE:

  NOTE: values for the patron are prepended with `patron` and values for the previousPatron are prepended with `previousPatron` 

  KEY:
  * = value is updated.
  x = value remains unchanged by the event.

  Patron (new):
  *- lastUpdated: BigInt!
  *- previouslyOwnedTokens: [Wildcard!]!
  *- tokens: [Wildcard!]!
  *- availableDeposit: BigInt!
  *- patronTokenCostScaledNumerator: BigInt!
  *- foreclosureTime: BigInt!
  *- totalContributed: BigInt!
  *- totalTimeHeld: BigInt!

  Patron (previous):
  *- lastUpdated: BigInt!
  x- previouslyOwnedTokens: [Wildcard!]!
  *- tokens: [Wildcard!]!
  *- availableDeposit: BigInt!
  *- patronTokenCostScaledNumerator: BigInt!
  *- foreclosureTime: BigInt!
  *- totalContributed: BigInt!
  *- totalTimeHeld: BigInt!
  */

  // Now even if the patron puts in extra deposit when they buy a new token this will foreclose their old tokens.
  let heldUntilNewPatron = txTimestamp; //minBigInt(patron.foreclosureTime, txTimestamp); // TODO: use min with foreclosureTime
  let heldUntilPreviousPatron = txTimestamp; //minBigInt(patron.foreclosureTime, txTimestamp); // TODO: use min with foreclosureTime

  let timeSinceLastUpdatePatron = heldUntilNewPatron.minus(patron.lastUpdated);
  let timeSinceLastUpdatePreviousPatron = heldUntilPreviousPatron.minus(
    patronOld.lastUpdated
  );

  let patronTotalTimeHeld =
    patron.id != "NO_OWNER"
      ? patron.totalTimeHeld.plus(
          timeSinceLastUpdatePatron.times(BigInt.fromI32(patron.tokens.length))
        )
      : BigInt.fromI32(0);
  let previousPatronTotalTimeHeld =
    patronOld.id != "NO_OWNER"
      ? patronOld.totalTimeHeld.plus(
          timeSinceLastUpdatePreviousPatron.times(
            BigInt.fromI32(patronOld.tokens.length)
          )
        )
      : BigInt.fromI32(0);

  let newPatronTotalContributed =
    patron.id != "NO_OWNER"
      ? patron.totalContributed.plus(
          patron.patronTokenCostScaledNumerator
            .times(timeSinceLastUpdatePatron)
            .div(GLOBAL_PATRONAGE_DENOMINATOR)
            .div(NUM_SECONDS_IN_YEAR_BIG_INT)
        )
      : BigInt.fromI32(0);
  let newPatronTotalPatronOwnedCost = steward.totalPatronOwnedTokenCost(owner);

  let previousPatronTotalContributed =
    patronOld.id != "NO_OWNER"
      ? patronOld.totalContributed.plus(
          patronOld.patronTokenCostScaledNumerator
            .times(timeSinceLastUpdatePreviousPatron)
            .div(GLOBAL_PATRONAGE_DENOMINATOR)
            .div(NUM_SECONDS_IN_YEAR_BIG_INT)
        )
      : BigInt.fromI32(0);

  let oldPatronTokenCostScaledNumerator =
    patronOld.id != "NO_OWNER"
      ? steward.totalPatronOwnedTokenCost(patronOld.address as Address)
      : BigInt.fromI32(0); // error

  let newPatronTokenArray = patron.tokens.concat([wildcard.id]);
  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  let oldPatronTokenArray = removeFromArrayAtIndex(patronOld.tokens, itemIndex);

  // let patronLastUpdated = steward.timeLastCollectedPatron(owner);
  let previousPatronLastUpdated = steward.timeLastCollectedPatron(
    patronOld.address as Address
  );

  /// Previous phase 2

  let heldUntil = minBigInt(patron.foreclosureTime, txTimestamp);
  let timeSinceLastUpdate = heldUntil.minus(patron.lastUpdated);
  // patron.totalTimeHeld = patron.totalTimeHeld.plus(
  //   timeSinceLastUpdate.times(BigInt.fromI32(patron.tokens.length))
  // );
  let patronTotalContributed = patron.totalContributed.plus(
    patron.patronTokenCostScaledNumerator
      .times(timeSinceLastUpdate)
      .div(GLOBAL_PATRONAGE_DENOMINATOR)
      .div(NUM_SECONDS_IN_YEAR_BIG_INT)
  );
  let patronLastUpdated = txTimestamp;

  // Add to previouslyOwnedTokens if not already there
  let patronPreviouslyOwnedTokens =
    patron.previouslyOwnedTokens.indexOf(wildcard.id) === -1
      ? patron.previouslyOwnedTokens.concat([wildcard.id])
      : patron.previouslyOwnedTokens;
  let patronAvailableDeposit = steward.depositAbleToWithdraw(owner);
  let patronForeclosureTime = getForeclosureTimeSafe(steward, owner);
  // Add token to the patrons currently held tokens
  let patronTokens =
    patron.tokens.indexOf(wildcard.id) === -1 // In theory this should ALWAYS be false.
      ? patron.tokens.concat([wildcard.id])
      : patron.tokens;
  // let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  let wasPreviousOwner = patronOld.id != "NO_OWNER";

  let timeSinceLastUpdateOldPatron: BigInt;
  let previousPatronPatronTokenCostScaledNumerator: BigInt;
  let previousPatronAvailableDeposit: BigInt;
  let previousPatronForeclosureTime: BigInt;
  if (wasPreviousOwner) {
    timeSinceLastUpdateOldPatron = txTimestamp.minus(patron.lastUpdated);
    // patronOld.totalTimeHeld = patron.totalTimeHeld.plus(
    //   timeSinceLastUpdateOldPatron.times(
    //     BigInt.fromI32(patronOld.tokens.length)
    //   )
    // );
    // let previousPatronTotalContributed = patronOld.totalContributed.plus(
    //   patronOld.patronTokenCostScaledNumerator
    //     .times(timeSinceLastUpdateOldPatron)
    //     .div(GLOBAL_PATRONAGE_DENOMINATOR)
    //     .div(NUM_SECONDS_IN_YEAR_BIG_INT)
    // );
    previousPatronPatronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
      patronOld.address as Address
    );
    // let previousPatronLastUpdated = txTimestamp;
    previousPatronAvailableDeposit = steward.depositAbleToWithdraw(
      patronOld.address as Address
    );
    previousPatronForeclosureTime = getForeclosureTimeSafe(
      steward,
      patronOld.address as Address
    );
  }
  // Remove token to the previous patron's tokens
  let previousPatronTokens = removeFromArrayAtIndex(
    patronOld.tokens,
    itemIndex
  );

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

  // let globalState = Global.load("1");
  // let tokenPatronageNumerator = steward.patronageNumerator(tokenIdBigInt);

  // globalState.totalTokenCostScaledNumerator = globalState.totalTokenCostScaledNumerator
  //   .plus(event.params.price.times(tokenPatronageNumerator))
  //   .minus(previousPrice.price.times(tokenPatronageNumerator));

  // globalState.save();
  // updateGlobalState(steward, txTimestamp);

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

  wildcard.totalCollected = getTotalCollectedForWildcard(
    steward,
    tokenIdBigInt,
    timeSinceLastUpdateOldPatron
  );
  wildcard.timeCollected = txTimestamp;

  wildcard.save();

  let buyEvent = new BuyEvent(txHashString);

  buyEvent.newOwner = patron.id;
  buyEvent.price = price.id;
  buyEvent.token = wildcard.id;
  buyEvent.timestamp = txTimestamp;
  buyEvent.save();

  let eventParamsString = "['" + tokenIdString  + "', '" + event.params.owner.toHexString()  + "', '" + event.params.price.toString() + "']";

  recognizeStateChange(
    txHashString,
    "Buy",
    eventParamsString,
    [patronOld.id, patron.id],
    [wildcard.id],
    txTimestamp,
    event.block.number,
    1
  );

  let eventCounter = EventCounter.load("1");
  eventCounter.buyEventCount = eventCounter.buyEventCount.plus(
    BigInt.fromI32(1)
  );
  eventCounter.buyEvents = eventCounter.buyEvents.concat([buyEvent.id]);
  eventCounter.save();

  // Phase 3:
  // patron.lastUpdated = timePatronLastUpdated;
  // patron.totalTimeHeld = newPatronTotalTimeHeld;
  // patron.tokens = newPatronTokenArray;
  // patron.patronTokenCostScaledNumerator = newPatronTokenCostScaledNumerator;
  patron.totalContributed = newPatronTotalContributed;
  patron.save();

  // patronOld.lastUpdated = timePatronOldLastUpdated;
  // patronOld.totalTimeHeld = oldPatronTotalTimeHeld;
  // patronOld.tokens = oldPatronTokenArray;
  patronOld.patronTokenCostScaledNumerator = oldPatronTokenCostScaledNumerator;
  // patronOld.totalContributed = oldPatronTotalContributed;
  patronOld.save();

  wildcard.owner = ownerString;
  wildcard.save();

  // Updated phase 3:
  patron.lastUpdated = patronLastUpdated;
  patron.previouslyOwnedTokens = patronPreviouslyOwnedTokens;
  patron.tokens = patronTokens;
  patron.availableDeposit = patronAvailableDeposit;
  patron.patronTokenCostScaledNumerator = newPatronTotalPatronOwnedCost;
  patron.foreclosureTime = patronForeclosureTime;
  patron.totalContributed = patronTotalContributed;
  patron.totalTimeHeld = patronTotalTimeHeld;
  patron.save();

  if (wasPreviousOwner) {
    patronOld.lastUpdated = previousPatronLastUpdated;
    patronOld.tokens = previousPatronTokens;
    patronOld.availableDeposit = previousPatronAvailableDeposit;
    patronOld.patronTokenCostScaledNumerator = previousPatronPatronTokenCostScaledNumerator;
    patronOld.foreclosureTime = previousPatronForeclosureTime;
    patronOld.totalContributed = previousPatronTotalContributed;
    patronOld.totalTimeHeld = previousPatronTotalTimeHeld;
    patronOld.save();
  }
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
  wildcard.timeCollected = timeLastCollectedWildcardSafe(
    steward,
    tokenIdBigInt
  );

  if (wildcard == null) {
    log.critical("Wildcard didn't exist with id: {} - THIS IS A FATAL ERROR", [
      tokenIdString,
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

  let eventParamsString = "['" + tokenIdString  + "', '" + event.params.newPrice.toString() + "']";

  recognizeStateChange(
    txHashString,
    "PriceChange",
    eventParamsString,
    [patron.id],
    [wildcard.id],
    txTimestamp,
    event.block.number,
    1
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
  let foreclosedPatron = event.params.prevOwner;
  let txTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();
  let patronString = foreclosedPatron.toHexString();
  let foreclosedTokens: Array<string> = [];

  // NOTE: The patron can be the steward contract in the case when the token forecloses; this can cause issues! Hence be careful and check it isn't the patron.
  if (patronString != event.address.toHexString()) {
    let patron = Patron.load(patronString);
    if (patron != null) {
      foreclosedTokens = patron.tokens;
      updateAllOfPatronsTokensLastUpdated(patron, steward, "handleForeclosure");
    }
  }

  updateAvailableDepositAndForeclosureTime(
    steward,
    foreclosedPatron,
    txTimestamp
  );

  let foreclosureTime = getForeclosureTimeSafe(steward, foreclosedPatron);

  let eventParamsString = "['" + event.params.prevOwner.toHexString()  + "', '" + foreclosureTime.toString() + "']";

  recognizeStateChange(
    txHashString,
    "Foreclosure",
    eventParamsString,
    [patronString],
    foreclosedTokens,
    txTimestamp,
    event.block.number,
    1
  );

  updateGlobalState(steward, txTimestamp);
  updateForeclosedTokens(foreclosedPatron, steward);
}

export function handleRemainingDepositUpdate(
  event: RemainingDepositUpdate
): void {
  let steward = Steward.bind(event.address);
  let tokenPatron = event.params.tokenPatron;
  let txTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();
  let patronString = tokenPatron.toHexString();

  // NOTE: The patron can be the steward contract in the case when the token forecloses; this can cause issues! Hence be careful and check it isn't the patron.
  // Also, the below code is totally redundant, just there for safety.
  if (patronString != event.address.toHexString()) {
    let patron = Patron.load(patronString);
    if (patron != null) {
      updateAllOfPatronsTokensLastUpdated(
        patron,
        steward,
        "handleCollectPatronage"
      );
    }
  }

  updateAvailableDepositAndForeclosureTime(steward, tokenPatron, txTimestamp);

  let eventParamsString = "['" + event.params.tokenPatron.toHexString()  + "', '" + event.params.remainingDeposit.toString() + "']";

  recognizeStateChange(
    txHashString,
    "RemainingDepositUpdate",
    eventParamsString,
    [patronString],
    [],
    txTimestamp,
    event.block.number,
    1
  );

  updateGlobalState(steward, txTimestamp);
}
export function handleCollectPatronage(event: CollectPatronage): void {
  let steward = Steward.bind(event.address);
  let tokenPatron = event.params.patron;
  let collectedToken = event.params.tokenId;
  let txTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();
  let patronString = tokenPatron.toHexString();

  // NOTE: The patron can be the steward contract in the case when the token forecloses; this can cause issues! Hence be careful and check it isn't the patron.
  if (patronString != event.address.toHexString()) {
    let patron = Patron.load(patronString);
    if (patron != null) {
      updateAllOfPatronsTokensLastUpdated(
        patron,
        steward,
        "handleCollectPatronage"
      );
    }
  }

  let wildcard = Wildcard.load(collectedToken.toString());
  if (wildcard != null) {
    wildcard.totalCollected = getTotalCollectedForWildcard(
      steward,
      collectedToken,
      event.block.timestamp.minus(wildcard.timeCollected)
    );
    wildcard.timeCollected = txTimestamp;
    wildcard.save();
  } else {
    log.critical("THE WILDCARD IS NULL??", []);
  }

  updateAvailableDepositAndForeclosureTime(steward, tokenPatron, txTimestamp);

  let eventParamsString = "['" + event.params.tokenId.toHexString()  + "', '" + event.params.patron.toHexString()  + "', '" + event.params.remainingDeposit.toString() + "', '" + event.params.amountReceived.toString() + "']";

  recognizeStateChange(
    txHashString,
    "CollectPatronage",
    eventParamsString,
    [patronString],
    [collectedToken.toString()],
    txTimestamp,
    event.block.number,
    1
  );

  updateGlobalState(steward, txTimestamp);
}
