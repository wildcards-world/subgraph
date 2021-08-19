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
  minBigInt,
  updateGlobalState,
  updateForeclosedTokens,
  removeFromArrayAtIndex,
  updateAllOfPatronsTokensLastUpdated,
  getTotalCollectedForWildcard,
  timeLastCollectedWildcardSafe,
  getCurrentOwner,
  initialiseNoOwnerPatronIfNull,
  saveEventToStateChange,
} from "../util";
import {
  GLOBAL_PATRONAGE_DENOMINATOR,
  NUM_SECONDS_IN_YEAR_BIG_INT,
  EVENT_COUNTER_ID,
  ID_PREFIX,
} from "../CONSTANTS";

export function handleBuy(event: Buy): void {
  // PART 1: reading and getting values.
  let owner = event.params.owner;
  let ownerString = ID_PREFIX + owner.toHexString();
  let txTimestamp = event.block.timestamp;
  let tokenIdBigInt = event.params.tokenId;
  let steward = Steward.bind(event.address);
  let tokenIdString = tokenIdBigInt.toString();
  let newWildcardPrice = event.params.price;

  let wildcard = Wildcard.load(ID_PREFIX + tokenIdString);
  if (wildcard == null) {
    log.critical("Wildcard didn't exist with id: {} - THIS IS A FATAL ERROR", [
      tokenIdString,
    ]);
  }
  let previousTokenOwner = wildcard.owner;
  let patronOld = Patron.load(ID_PREFIX + previousTokenOwner);
  if (patronOld == null) {
    patronOld = initialiseNoOwnerPatronIfNull();
  }

  /// OTHER CODE
  let txHashString = event.transaction.hash.toHexString();

  let previousTimeWildcardWasAcquired = wildcard.timeAcquired;

  // Entity fields can be set using simple assignments
  wildcard.tokenId = tokenIdBigInt;

  wildcard.priceHistory = wildcard.priceHistory.concat([wildcard.price]);
  wildcard.timeCollected = timeLastCollectedWildcardSafe(
    steward,
    tokenIdBigInt
  );

  let patron = Patron.load(ownerString);
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
    patron.isMarkedAsForeclosed = true;
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
    patron.id != ID_PREFIX + "NO_OWNER"
      ? patron.totalTimeHeld.plus(
          timeSinceLastUpdatePatron.times(BigInt.fromI32(patron.tokens.length))
        )
      : BigInt.fromI32(0);
  let previousPatronTotalTimeHeld =
    patronOld.id != ID_PREFIX + "NO_OWNER"
      ? patronOld.totalTimeHeld.plus(
          timeSinceLastUpdatePreviousPatron.times(
            BigInt.fromI32(patronOld.tokens.length)
          )
        )
      : BigInt.fromI32(0);

  let newPatronTotalContributed =
    patron.id != ID_PREFIX + "NO_OWNER"
      ? patron.totalContributed.plus(
          patron.patronTokenCostScaledNumerator
            .times(timeSinceLastUpdatePatron)
            .div(GLOBAL_PATRONAGE_DENOMINATOR)
            .div(NUM_SECONDS_IN_YEAR_BIG_INT)
        )
      : BigInt.fromI32(0);
  let newPatronTotalPatronOwnedCost = steward.totalPatronOwnedTokenCost(owner);

  let previousPatronTotalContributed =
    patronOld.id != ID_PREFIX + "NO_OWNER"
      ? patronOld.totalContributed.plus(
          patronOld.patronTokenCostScaledNumerator
            .times(timeSinceLastUpdatePreviousPatron)
            .div(GLOBAL_PATRONAGE_DENOMINATOR)
            .div(NUM_SECONDS_IN_YEAR_BIG_INT)
        )
      : BigInt.fromI32(0);

  let oldPatronTokenCostScaledNumerator =
    patronOld.id != ID_PREFIX + "NO_OWNER"
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
  let wasPreviousOwner = patronOld.id != ID_PREFIX + "NO_OWNER";

  let oldPrice = Price.load(wildcard.price);
  let scaledDelta = wildcard.patronageNumerator.times(
    newWildcardPrice.minus(oldPrice.price)
  );

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
    if (patronOld.foreclosureTime.gt(txTimestamp)) {
      previousPatronForeclosureTime = getForeclosureTimeSafe(
        steward,
        patronOld.address as Address
      );
    } else {
      previousPatronForeclosureTime = patronOld.foreclosureTime;
    }
  }
  // Remove token to the previous patron's tokens
  let previousPatronTokens = removeFromArrayAtIndex(
    patronOld.tokens,
    itemIndex
  );

  patron.save();
  patronOld.save();

  if (wildcard.owner !== ID_PREFIX + "NO_OWNER") {
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

  // let globalState = Global.load(GLOBAL_ID);
  // let tokenPatronageNumerator = steward.patronageNumerator(tokenIdBigInt);

  // globalState.totalTokenCostScaledNumerator = globalState.totalTokenCostScaledNumerator
  //   .plus(event.params.price.times(tokenPatronageNumerator))
  //   .minus(previousPrice.price.times(tokenPatronageNumerator));

  // globalState.save();
  // updateGlobalState(steward, txTimestamp);
  // TODO ADD ME BACK IN SO totalTokenCostScaledNumerator is correct

  let price = new Price(txHashString);
  price.price = newWildcardPrice;
  price.timeSet = txTimestamp;
  price.save();

  wildcard.price = price.id;
  wildcard.currPrice = price.price;
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

  let eventParamValues: Array<string> = [
    event.params.tokenId.toString(),
    event.params.owner.toHex(),
    event.params.price.toString(),
  ];
  let eventParamNames: Array<string> = ["tokenId", "owner", "price"];

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
    1
  );

  let eventCounter = EventCounter.load(EVENT_COUNTER_ID);
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

  updateGlobalState(steward, txTimestamp, scaledDelta);
}

export function handlePriceChange(event: PriceChange): void {
  let tokenIdBigInt = event.params.tokenId;
  let tokenIdString = tokenIdBigInt.toString();
  let txHashString = event.transaction.hash.toHexString();

  let steward = Steward.bind(event.address);
  let owner = getCurrentOwner(steward, tokenIdBigInt);
  let ownerString = owner.toHexString();
  let txTimestamp = event.block.timestamp;

  let wildcard = Wildcard.load(ID_PREFIX + tokenIdString);

  if (wildcard == null) {
    log.critical("Wildcard didn't exist with id: {} - THIS IS A FATAL ERROR", [
      tokenIdString,
    ]);
  }

  wildcard.timeCollected = timeLastCollectedWildcardSafe(
    steward,
    tokenIdBigInt
  );

  // Entity fields can be set using simple assignments
  wildcard.tokenId = tokenIdBigInt;

  let price = new Price(txHashString);
  price.price = event.params.newPrice;
  price.timeSet = txTimestamp;
  price.save();

  let oldPrice = Price.load(wildcard.price);
  let scaledDelta = wildcard.patronageNumerator.times(
    price.price.minus(oldPrice.price)
  );

  wildcard.price = price.id;
  wildcard.currPrice = price.price;
  wildcard.patronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );
  wildcard.save();

  let patron = Patron.load(ID_PREFIX + wildcard.owner);

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

  let eventParamValues: Array<string> = [
    tokenIdString,
    event.params.newPrice.toString(),
  ];
  let eventParamNames: Array<string> = ["tokenId", "newPrice"];

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
    1
  );

  let eventCounter = EventCounter.load(EVENT_COUNTER_ID);
  eventCounter.changePriceEventCount = eventCounter.changePriceEventCount.plus(
    BigInt.fromI32(1)
  );
  eventCounter.save();

  updateGlobalState(steward, txTimestamp, scaledDelta);
}
export function handleForeclosure(event: Foreclosure): void {
  let steward = Steward.bind(event.address);
  let foreclosedPatron = event.params.prevOwner;
  let txTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();
  let patronString = foreclosedPatron.toHexString();
  let foreclosedTokens: Array<string> = [];

  // NB CHECK CONDITION BELOW, only want delta to be recognized once when patron forecloses
  let foreclosureTime = BigInt.fromI32(0);

  // NOTE: The patron can be the steward contract in the case when the token forecloses; this can cause issues! Hence be careful and check it isn't the patron.
  if (patronString != event.address.toHexString()) {
    let patron = Patron.load(ID_PREFIX + patronString);
    if (patron != null) {
      foreclosureTime = patron.foreclosureTime;
      foreclosedTokens = patron.tokens;
      updateAllOfPatronsTokensLastUpdated(patron, steward, "handleForeclosure");
    }
  }

  let scaledDelta = updateAvailableDepositAndForeclosureTime(
    steward,
    foreclosedPatron,
    txTimestamp,
    false
  );

  // let foreclosureTime = getForeclosureTimeSafe(steward, foreclosedPatron);

  let eventParamValues: Array<string> = [
    event.params.prevOwner.toHex(),
    foreclosureTime.toString(),
  ];
  let eventParamNames: Array<string> = ["prevOwner", "foreclosureTime"];

  let eventParamTypes: Array<string> = ["address", "uint256"];

  saveEventToStateChange(
    event.transaction.hash,
    txTimestamp,
    event.block.number,
    "Foreclosure",
    eventParamValues,
    eventParamNames,
    eventParamTypes,
    [patronString],
    foreclosedTokens,
    1
  );

  updateGlobalState(steward, txTimestamp, scaledDelta);
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

  let updatePatronForeclosureTime = false;
  // NOTE: The patron can be the steward contract in the case when the token forecloses; this can cause issues! Hence be careful and check it isn't the patron.
  // Also, the below code is totally redundant, just there for safety.
  if (patronString != event.address.toHexString()) {
    let patron = Patron.load(ID_PREFIX + patronString);
    if (patron != null) {
      updatePatronForeclosureTime = getForeclosureTimeSafe(
        steward,
        tokenPatron
      ).gt(BigInt.fromI32(0));
      updateAllOfPatronsTokensLastUpdated(
        patron,
        steward,
        "handleCollectPatronage"
      );
    }
  }

  let scaledDelta = updateAvailableDepositAndForeclosureTime(
    steward,
    tokenPatron,
    txTimestamp,
    updatePatronForeclosureTime
  );

  let eventParamValues: Array<string> = [
    event.params.tokenPatron.toHexString(),
    event.params.remainingDeposit.toString(),
  ];
  let eventParamNames: Array<string> = ["tokenPatron", "newPrice"];

  let eventParamTypes: Array<string> = ["address", "uint256"];

  saveEventToStateChange(
    event.transaction.hash,
    txTimestamp,
    event.block.number,
    "RemainingDepositUpdate",
    eventParamValues,
    eventParamNames,
    eventParamTypes,
    [patronString],
    [],
    1
  );

  updateGlobalState(steward, txTimestamp, scaledDelta);
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
    let patron = Patron.load(ID_PREFIX + patronString);
    if (patron != null) {
      updateAllOfPatronsTokensLastUpdated(
        patron,
        steward,
        "handleCollectPatronage"
      );
    }
  }

  let wildcard = Wildcard.load(ID_PREFIX + collectedToken.toString());
  if (wildcard != null) {
    let oldTimeCollected = wildcard.timeCollected;
    let newTotalCollected = getTotalCollectedForWildcard(
      steward,
      collectedToken,
      event.block.timestamp.minus(oldTimeCollected)
    );
    wildcard.totalCollected = newTotalCollected;
    wildcard.timeCollected = txTimestamp;
    wildcard.save();
  } else {
    log.critical("THE WILDCARD IS NULL??", []);
  }

  updateAvailableDepositAndForeclosureTime(
    steward,
    tokenPatron,
    txTimestamp,
    false
  );

  let eventParamValues: Array<string> = [
    event.params.tokenId.toHexString(),
    event.params.patron.toHexString(),
    event.params.remainingDeposit.toString(),
    event.params.amountReceived.toString(),
  ];
  let eventParamNames: Array<string> = [
    "tokenId",
    "patron",
    "remainingDeposit",
    "amountRecieved",
  ];

  let eventParamTypes: Array<string> = [
    "uint256",
    "address",
    "uint256",
    "uint256",
  ];

  saveEventToStateChange(
    event.transaction.hash,
    txTimestamp,
    event.block.number,
    "CollectPatronage",
    eventParamValues,
    eventParamNames,
    eventParamTypes,
    [patronString],
    [collectedToken.toString()],
    1
  );

  // Here totalTokenCostScaledNumeratorAccurate not updated
  let scaledDelta = BigInt.fromI32(0);
  updateGlobalState(steward, txTimestamp, scaledDelta);
}
