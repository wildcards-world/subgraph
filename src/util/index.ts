import { Steward } from "../../generated/Steward/Steward";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  Patron,
  StateChange,
  EventCounter,
  Global
} from "../../generated/schema";
import { log } from "@graphprotocol/graph-ts";
import {
  ZERO_ADDRESS,
  GLOBAL_PATRONAGE_DENOMINATOR,
  NUM_SECONDS_IN_YEAR_BIG_INT
} from "../CONSTANTS";
import {
  getTotalOwedAccurate,
  getTotalTokenCostScaledNumerator
} from "./hacky";

export function minBigInt(first: BigInt, second: BigInt): BigInt {
  if (BigInt.compare(first, second) < 0) {
    return first;
  } else {
    return second;
  }
}

export function updateGlobalState(steward: Steward, txTimestamp: BigInt): void {
  let globalState = Global.load("1");
  // globalState.totalCollectedAccurate = getTotalCollectedAccurate(steward);
  globalState.totalTokenCostScaledNumeratorAccurate = getTotalTokenCostScaledNumerator(
    steward
  );
  let totalOwed = getTotalOwedAccurate(steward);
  globalState.totalCollectedOrDueAccurate = globalState.totalCollectedAccurate.plus(
    totalOwed
  );
  // BUG!
  // This code below is inaccurate because the `timeLastCollected` isn't correct. Should have `timeLastCalculatedCollection` as separate variable
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

export function getForeclosureTimeSafe(
  steward: Steward,
  tokenPatron: Address
): BigInt {
  let tryForeclosureTime = steward.try_foreclosureTimePatron(tokenPatron); // this call can error if the combined price of the patrons token is zero (divide by zero error)!
  if (tryForeclosureTime.reverted) {
    return BigInt.fromI32(0);
  } else {
    const patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
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

export function initialiseDefaultPatronIfNull(
  steward: Steward,
  patronAddress: Address,
  txTimestamp: BigInt
): Patron {
  let patronId = patronAddress.toHexString();
  let patron = new Patron(patronId);
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
  patron.save();
  return patron;
}

export function updateAvailableDepositAndForeclosureTime(
  steward: Steward,
  tokenPatron: Address,
  txTimestamp: BigInt
): void {
  // if the token patron is the zero address, return! (for example it will be the zero address if the token is foreclosed and )
  if (tokenPatron.equals(ZERO_ADDRESS)) {
    return;
  }

  // if the steward 'owns' the token, it means that the token was foreclosed. No need to update anything.
  if (steward._address.equals(tokenPatron)) {
    return;
  }

  let tokenPatronStr = tokenPatron.toHexString();

  let patron = Patron.load(tokenPatronStr);

  if (patron == null) {
    patron = initialiseDefaultPatronIfNull(steward, tokenPatron, txTimestamp);
    return;
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
  patron.foreclosureTime = getForeclosureTimeSafe(steward, tokenPatron);
  patron.lastUpdated = txTimestamp;
  patron.save();
}

// NOTE: it is impossible for this code to return null, the compiler is just retarded!
export function getOrInitialiseStateChange(txId: string): StateChange | null {
  let stateChange = StateChange.load(txId);

  if (stateChange == null) {
    stateChange = new StateChange(txId);
    stateChange.txEventList = [];
    stateChange.patronChanges = [];
    stateChange.wildcardChange = [];

    let eventCounter = EventCounter.load("1");
    eventCounter.stateChanges = eventCounter.stateChanges.concat([
      stateChange.id
    ]);
    eventCounter.save();

    return stateChange;
  } else {
    return stateChange;
  }
}

export function recognizeStateChange(
  txHash: string,
  changeType: string,
  changedPatrons: string[],
  changedWildcards: string[],
  txTimestamp: BigInt
): void {
  let stateChange = getOrInitialiseStateChange(txHash);
  stateChange.txEventList = stateChange.txEventList.concat([changeType]);

  for (let i = 0, len = changedPatrons.length; i < len; i++) {
    stateChange.patronChanges =
      stateChange.patronChanges.indexOf(changedPatrons[i]) === -1
        ? stateChange.patronChanges.concat([changedPatrons[i]])
        : stateChange.patronChanges;
  }

  for (let i = 0, len = changedWildcards.length; i < len; i++) {
    stateChange.wildcardChange =
      stateChange.wildcardChange.indexOf(changedWildcards[i]) === -1
        ? stateChange.wildcardChange.concat([changedWildcards[i]])
        : stateChange.wildcardChange;
  }

  stateChange.timestamp = txTimestamp;
  stateChange.save();
}
