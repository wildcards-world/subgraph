import { Steward } from "../../generated/Steward/Steward";
import { LoyaltyToken } from "../../generated/LoyaltyToken/LoyaltyToken";
import { Address, BigInt, log, Bytes, json } from "@graphprotocol/graph-ts";
import {
  Patron,
  StateChange,
  EventParam,
  EventParams,
  EventCounter,
  Global,
  Wildcard,
  TokenUri,
  Price,
} from "../../generated/schema";
import {
  ZERO_ADDRESS,
  GLOBAL_PATRONAGE_DENOMINATOR,
  NUM_SECONDS_IN_YEAR_BIG_INT,
  AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT,
  EVENT_COUNTER_ID,
  GLOBAL_ID,
  ID_PREFIX,
  ZERO_BN,
} from "../CONSTANTS";
import {
  getTotalOwedAccurate,
  getTotalTokenCostScaledNumerator,
  getTotalCollectedAccurate,
} from "./hacky";
import { Token } from "../../generated/Token/Token";

export function minBigInt(first: BigInt, second: BigInt): BigInt {
  if (BigInt.compare(first, second) < 0) {
    return first;
  } else {
    return second;
  }
}

export function getTokenContract(): Token {
  let globalState = Global.load(GLOBAL_ID);
  if (globalState == null) {
    log.critical("Global state must be defined before using this function", []);
  }
  return Token.bind(globalState.erc721Address as Address);
}

export function getCurrentOwner(steward: Steward, wildcardId: BigInt): Address {
  // load what version we are in (through global state)
  let globalState = Global.load(GLOBAL_ID);
  let currentVersion = globalState.version;

  if (currentVersion.ge(BigInt.fromI32(3))) {
    let tokenContract = getTokenContract();
    let currentOwner = tokenContract.ownerOf(wildcardId);
    return currentOwner;
  } else {
    return steward.currentPatron(wildcardId);
  }
}

export function timeLastCollectedWildcardSafe(
  steward: Steward,
  wildcardId: BigInt
): BigInt {
  // load what version we are in (through global state)
  let globalState = Global.load(GLOBAL_ID);
  let currentVersion = globalState.version;

  // NOTE: in v3 onwards, timeLastCollectedPatron = timeLastCollected
  // execute correct function based on the version.
  if (currentVersion.ge(BigInt.fromI32(3))) {
    let currentOwner = getCurrentOwner(steward, wildcardId);
    return steward.timeLastCollectedPatron(currentOwner);
  } else {
    let toReturn = steward.try_timeLastCollected(wildcardId);
    if (toReturn.reverted) {
      log.warning("IT REVERTED", []);
      return BigInt.fromI32(0);
    }
    return toReturn.value;
  }
}

export function warnAndError(msg: string, args: Array<string>): void {
  log.warning(msg, args);
  log.critical(msg, args);
}

// This currently only works with strings, because assembly script is shit... (the tests do pass when this is a template parameter though :) )
export function removeFromArrayAtIndex(
  array: Array<string>,
  index: i32
): Array<string> {
  if (array.length > index && index > -1) {
    return array.slice(0, index).concat(array.slice(index + 1, array.length));
  } else {
    return array;
  }
}

export function updateGlobalState(
  steward: Steward,
  txTimestamp: BigInt,
  totalTokenCostScaledNumeratorDelta: BigInt
): void {
  let globalState = Global.load(GLOBAL_ID);
  let totalTokenCostScaledNumeratorAccurate = getTotalTokenCostScaledNumerator(
    steward,
    totalTokenCostScaledNumeratorDelta
  );
  globalState.totalCollectedAccurate = getTotalCollectedAccurate(
    steward,
    totalTokenCostScaledNumeratorAccurate,
    txTimestamp
  );
  let totalOwed = getTotalOwedAccurate(steward);
  globalState.totalCollectedOrDueAccurate = globalState.totalCollectedAccurate.plus(
    totalOwed
  );
  // BUG!
  // This code below is inaccurate because the `timeLastCollected` isn't correct. Should have `timeLastCalculatedCollection` as separate variable

  globalState.totalTokenCostScaledNumeratorAccurate = totalTokenCostScaledNumeratorAccurate;
  globalState.timeLastCollected = txTimestamp;
  globalState.save();
}

export function getForeclosureTimeSafe(
  steward: Steward,
  tokenPatron: Address
): BigInt {
  let tryForeclosureTime = steward.try_foreclosureTimePatron(tokenPatron); // this call can error if the combined price of the patrons token is zero (divide by zero error)!
  if (tryForeclosureTime.reverted) {
    return BigInt.fromI32(0);
  } else {
    let patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
      tokenPatron
    );
    if (patronTokenCostScaledNumerator.equals(BigInt.fromI32(0))) {
      // NOTE: this case is logically impossible, but just added for extra safety...
      return BigInt.fromI32(0);
    } else {
      return tryForeclosureTime.value;
    }
  }
}

export function initialiseNoOwnerPatronIfNull(): Patron {
  let patron = new Patron(ID_PREFIX + "NO_OWNER");
  patron.address = ZERO_ADDRESS;
  patron.lastUpdated = BigInt.fromI32(0);
  patron.availableDeposit = BigInt.fromI32(0);
  patron.patronTokenCostScaledNumerator = BigInt.fromI32(0);
  patron.foreclosureTime = BigInt.fromI32(0);
  patron.totalContributed = BigInt.fromI32(0);
  patron.totalTimeHeld = BigInt.fromI32(0);
  patron.tokens = [];
  patron.previouslyOwnedTokens = [];
  patron.totalLoyaltyTokens = BigInt.fromI32(0);
  patron.totalLoyaltyTokensIncludingUnRedeemed = BigInt.fromI32(0);
  patron.currentBalance = BigInt.fromI32(0);
  patron.isMarkedAsForeclosed = true;
  patron.save();
  return patron;
}

export function initialiseDefaultPatronIfNull(
  steward: Steward,
  patronAddress: Address,
  txTimestamp: BigInt
): Patron {
  let patronId = patronAddress.toHexString();
  let patron = new Patron(ID_PREFIX + patronId);
  patron.address = patronAddress;
  patron.lastUpdated = txTimestamp;
  patron.availableDeposit = steward.depositAbleToWithdraw(patronAddress);
  patron.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    patronAddress
  );
  patron.foreclosureTime = getForeclosureTimeSafe(steward, patronAddress);
  patron.totalContributed = BigInt.fromI32(0);
  patron.totalTimeHeld = BigInt.fromI32(0);
  patron.tokens = [];
  patron.previouslyOwnedTokens = [];
  patron.totalLoyaltyTokens = BigInt.fromI32(0);
  patron.totalLoyaltyTokensIncludingUnRedeemed = BigInt.fromI32(0);
  patron.currentBalance = BigInt.fromI32(0);
  patron.isMarkedAsForeclosed = true;
  patron.save();
  return patron;
}

export function updateAvailableDepositAndForeclosureTime(
  steward: Steward,
  tokenPatron: Address,
  txTimestamp: BigInt,
  updatePatronForeclosureTime: boolean
): BigInt {
  let scaledDelta = BigInt.fromI32(0); ///// NOTE - this value is only used if the token forecloses.

  // if the token patron is the zero address, return! (for example it will be the zero address if the token is foreclosed and )
  if (tokenPatron.equals(ZERO_ADDRESS)) {
    return scaledDelta;
  }

  // if the steward 'owns' the token, it means that the token was foreclosed. No need to update anything.
  if (steward._address.equals(tokenPatron)) {
    return scaledDelta;
  }

  let tokenPatronStr = tokenPatron.toHexString();

  let patron = Patron.load(ID_PREFIX + tokenPatronStr);

  if (patron == null) {
    patron = initialiseDefaultPatronIfNull(steward, tokenPatron, txTimestamp);
    return scaledDelta;
  }

  let heldUntil = minBigInt(patron.foreclosureTime, txTimestamp);
  let timeSinceLastUpdate = heldUntil.minus(patron.lastUpdated);
  patron.totalContributed = patron.totalContributed.plus(
    patron.patronTokenCostScaledNumerator
      .times(timeSinceLastUpdate)
      .div(GLOBAL_PATRONAGE_DENOMINATOR)
      .div(NUM_SECONDS_IN_YEAR_BIG_INT)
  );
  patron.totalTimeHeld = patron.totalTimeHeld.plus(
    timeSinceLastUpdate.times(BigInt.fromI32(patron.tokens.length))
  );
  patron.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    patron.address as Address
  );
  patron.availableDeposit = steward.depositAbleToWithdraw(tokenPatron);
  let isForeclosed = patron.availableDeposit.equals(ZERO_BN);
  if (isForeclosed) {
    if (patron.isMarkedAsForeclosed) {
      log.warning("the user {} was already marked as foreclosed", [
        patron.address.toHex(),
      ]);
    } else {
      log.warning("Setting user {} as foreclosed", [patron.address.toHex()]);
      if (patron != null) {
        scaledDelta = patron.patronTokenCostScaledNumerator.times(
          BigInt.fromI32(-1)
        );
      }
      patron.isMarkedAsForeclosed = true;
    }
  } else {
    if (!patron.isMarkedAsForeclosed) {
      log.warning("the user {} was already NOT marked as foreclosed", [
        patron.address.toHex(),
      ]);
    } else {
      log.warning("Setting user {} as active!", [patron.address.toHex()]);
      patron.isMarkedAsForeclosed = false;
    }
  }
  if (updatePatronForeclosureTime) {
    patron.foreclosureTime = getForeclosureTimeSafe(steward, tokenPatron);
  }
  patron.lastUpdated = txTimestamp;
  patron.save();

  return scaledDelta;
}

// NOTE: it is impossible for this code to return null, the compiler is just retarded!
export function getOrInitialiseStateChange(txId: string): StateChange | null {
  let stateChange = StateChange.load(txId);

  if (stateChange == null) {
    stateChange = new StateChange(txId);
    stateChange.txEventParamList = [];
    stateChange.patronChanges = [];
    stateChange.wildcardChanges = [];

    let eventCounter = EventCounter.load(EVENT_COUNTER_ID);
    eventCounter.stateChanges = eventCounter.stateChanges.concat([
      stateChange.id,
    ]);
    eventCounter.save();

    return stateChange;
  } else {
    return stateChange;
  }
}

function getEventIndex(txHash: Bytes): i32 {
  let stateChange = StateChange.load(txHash.toHex());
  if (stateChange == null) {
    return 0;
  }
  return stateChange.txEventParamList.length;
}

function createEventParams(
  txHash: Bytes,
  argValues: Array<string>,
  argNames: Array<string>,
  argTypes: Array<string>
): Array<string> {
  let eventIndex: i32 = getEventIndex(txHash);

  let eventParamsArr: Array<string> = [];

  for (let index = 0; index < argValues.length; index++) {
    let eventParamFund = new EventParam(
      txHash.toHex() + "-" + eventIndex.toString() + "-" + index.toString()
    );
    eventParamFund.index = index;
    eventParamFund.param = argValues[index];
    eventParamFund.paramName = argNames[index];
    eventParamFund.paramType = argTypes[index];
    eventParamFund.save();

    eventParamsArr.push(eventParamFund.id);
  }

  return eventParamsArr;
}

function txEventParamsHelper(
  eventName: string,
  eventIndex: i32,
  eventTxHash: Bytes,
  eventParamsArr: Array<string>
): EventParams {
  let eventParams = new EventParams(
    eventTxHash.toHex() + "-" + eventIndex.toString()
  );

  eventParams.index = eventIndex;
  eventParams.eventName = eventName;
  eventParams.params = eventParamsArr;

  eventParams.save();

  return eventParams;
}

function txStateChangeHelper(
  txHash: Bytes,
  timeStamp: BigInt,
  blockNumber: BigInt,
  eventName: string,
  eventParamArray: Array<string>,
  changedPatrons: string[],
  changedWildcards: string[],
  contractVersion: i32
): void {
  let stateChange = getOrInitialiseStateChange(txHash.toHex());

  if (stateChange == null) {
    stateChange = new StateChange(txHash.toHex());
    stateChange.txEventParamList = [];
  }

  let eventIndex: i32 = getEventIndex(txHash);

  // create EventParams
  let eventParams = txEventParamsHelper(
    eventName,
    eventIndex,
    txHash,
    eventParamArray
  );

  stateChange.timestamp = timeStamp;
  stateChange.blockNumber = blockNumber;

  stateChange.txEventParamList = stateChange.txEventParamList.concat([
    eventParams.id,
  ]);

  for (let i = 0, len = changedPatrons.length; i < len; i++) {
    stateChange.patronChanges =
      stateChange.patronChanges.indexOf(changedPatrons[i]) === -1
        ? stateChange.patronChanges.concat([changedPatrons[i]])
        : stateChange.patronChanges;
  }

  for (let i = 0, len = changedWildcards.length; i < len; i++) {
    stateChange.wildcardChanges =
      stateChange.wildcardChanges.indexOf(changedWildcards[i]) === -1
        ? stateChange.wildcardChanges.concat([changedWildcards[i]])
        : stateChange.wildcardChanges;
  }
  stateChange.contractVersion = contractVersion;

  stateChange.save();
}

export function saveEventToStateChange(
  txHash: Bytes,
  timestamp: BigInt,
  blockNumber: BigInt,
  eventName: string,
  parameterValues: Array<string>,
  parameterNames: Array<string>,
  parameterTypes: Array<string>,
  changedPatrons: string[],
  changedWildcards: string[],
  version: i32
): void {
  let eventParamsArr: Array<string> = createEventParams(
    txHash,
    parameterValues,
    parameterNames,
    parameterTypes
  );

  txStateChangeHelper(
    txHash,
    timestamp,
    blockNumber,
    eventName,
    eventParamsArr,
    changedPatrons,
    changedWildcards,
    version
  );
}

export function updateForeclosedTokens(
  foreclosedPatron: Address,
  steward: Steward
): string[] {
  /**
   * PHASE 1 - load data
   */

  // TODO: this function isn't complete. Revisit.
  let foreclosedPatronString = foreclosedPatron.toHexString();
  let patronOld = Patron.load(ID_PREFIX + foreclosedPatronString);

  /**
   * PHASE 2 - update data
   */
  // TODO: update Vitalik wildcard entity also.

  let prevTokens = patronOld.previouslyOwnedTokens;
  // NOTE: this shouldn't be necessary, `previouslyOwnedTokens` is updated for the patron when the token is bought.
  for (let i = 0; i < patronOld.previouslyOwnedTokens.length; ++i) {
    // patron
    let currentToken = prevTokens[i];
    patronOld.previouslyOwnedTokens =
      patronOld.previouslyOwnedTokens.indexOf(currentToken) === -1
        ? patronOld.previouslyOwnedTokens.concat([currentToken])
        : patronOld.previouslyOwnedTokens;
  }
  patronOld.tokens = []; // NOTE: Only safe to do this because Simon held Legacy vitalik the whole time (otherwise would need to check if this user held legacy vitalik).
  patronOld.lastUpdated = steward.timeLastCollectedPatron(foreclosedPatron); // TODO: double check this.

  /**
   * PHASE 3 - save data
   */
  patronOld.save();

  return prevTokens;
}

export function handleAddTokenUtil(
  tokenId: BigInt,
  txTimestamp: BigInt,
  patronageNumerator: BigInt,
  wildcard: Wildcard,
  steward: Steward,
  txHashStr: string
): Wildcard {
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
  wildcard.timeCollected = txTimestamp;

  let price = new Price(txHashStr);
  let initialPrice = ZERO_BN;
  price.price = initialPrice;
  price.timeSet = txTimestamp;
  price.save();

  let patron = Patron.load(ID_PREFIX + "NO_OWNER");
  if (patron == null) {
    patron = initialiseNoOwnerPatronIfNull();
  }

  wildcard.currPrice = price.price;
  wildcard.price = price.id;
  wildcard.owner = patron.id;
  wildcard.patronageNumerator = patronageNumerator;
  wildcard.patronageNumeratorPriceScaled = BigInt.fromI32(0);
  wildcard.timeAcquired = txTimestamp;
  wildcard.previousOwners = [];

  wildcard.save();

  return wildcard;
}

export function getTokenBalance(
  user: Address,
  loyaltyToken: LoyaltyToken
): BigInt {
  return loyaltyToken.balanceOf(user);
}

export function getTokenBalanceWithSteward(
  user: Address,
  stewardAddress: Address
): BigInt {
  let loyaltyToken: LoyaltyToken;
  if (
    stewardAddress.toHexString() == "0x6d47cf86f6a490c6410fc082fd1ad29cf61492d0"
  ) {
    loyaltyToken = LoyaltyToken.bind(
      Address.fromString("0x773c75c2277ed3e402bdefd28ec3b51a3afbd8a4")
    );
  } else if (
    stewardAddress.toHexString() == "0x0c00cfe8ebb34fe7c31d4915a43cde211e9f0f3b"
  ) {
    loyaltyToken = LoyaltyToken.bind(
      Address.fromString("0xd7d8c42ab5b83aa3d4114e5297989dc27bdfb715")
    );
  } else {
    log.critical("UNKNOWN NETWORK", []);
  }

  return getTokenBalance(user, loyaltyToken);
}

export function updateAllOfPatronsTokensLastUpdated(
  patron: Patron | null,
  steward: Steward,
  trackingString: string
): void {
  if (patron == null) {
    log.critical("patron should always be defined", []);
    return;
  }

  let patronsTokens: Array<string> = patron.tokens;

  for (let i = 0, len = patronsTokens.length; i < len; i++) {
    let wildcardId = patronsTokens[i];

    let wildcard = Wildcard.load(wildcardId);
    if (wildcard == null) {
      log.critical("the wildcard's ID is null", []);
    }

    let newTimeCollected = timeLastCollectedWildcardSafe(
      steward,
      wildcard.tokenId
    );
    let newtotalCollected = getTotalCollectedForWildcard(
      steward,
      wildcard.tokenId,
      newTimeCollected.minus(wildcard.timeCollected)
    );
    wildcard.timeCollected = newTimeCollected;
    wildcard.totalCollected = newtotalCollected;

    wildcard.save();
  }
}

export function isVitalik(tokenId: BigInt): boolean {
  return tokenId.equals(BigInt.fromI32(42));
}

export function safeGetTotalCollected(
  steward: Steward,
  tokenId: BigInt,
  timeSinceLastCollection: BigInt
): BigInt {
  let globalState = Global.load(GLOBAL_ID);
  let currentVersion = globalState.version;

  if (currentVersion.lt(BigInt.fromI32(3))) {
    return steward.totalCollected(tokenId);
  } else {
    let wildcard = Wildcard.load(ID_PREFIX + tokenId.toString());

    // TODO: unfortunately this is being written to 'just' work and mathematical rigor is likely being lost.
    let newlyCollected = timeSinceLastCollection
      .times(wildcard.patronageNumeratorPriceScaled)
      .div(GLOBAL_PATRONAGE_DENOMINATOR)
      .div(NUM_SECONDS_IN_YEAR_BIG_INT);

    let currentTotalCollected = wildcard.totalCollected;
    return currentTotalCollected.plus(newlyCollected);
  }
}

/*
  This function needs to be called in the following places:
  buy
  collection 
*/
export function getTotalCollectedForWildcard(
  steward: Steward,
  tokenId: BigInt,
  timeSinceLastCollection: BigInt
): BigInt {
  let totalCollected: BigInt;
  if (isVitalik(tokenId)) {
    // Include the patronage from the legacy vitalik contract.
    totalCollected = safeGetTotalCollected(
      steward,
      tokenId,
      timeSinceLastCollection
    ).plus(AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT);
  } else {
    totalCollected = safeGetTotalCollected(
      steward,
      tokenId,
      timeSinceLastCollection
    );
  }

  return totalCollected;
}
