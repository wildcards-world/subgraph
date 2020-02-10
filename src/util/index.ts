import { Steward } from "../../generated/Steward/Steward";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Patron, StateChange, EventCounter } from "../../generated/schema";
import { log } from "@graphprotocol/graph-ts";
import {
  ZERO_ADDRESS,
  GLOBAL_PATRONAGE_DENOMINATOR,
  NUM_SECONDS_IN_YEAR_BIG_INT
} from "../CONSTANTS";

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
  currentTimestamp: BigInt
): Patron {
  let patronId = patronAddress.toHexString();
  let patron = new Patron(patronId);
  patron.address = patronAddress;
  patron.lastUpdated = currentTimestamp;
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

  patron.availableDeposit = steward.depositAbleToWithdraw(tokenPatron);
  patron.foreclosureTime = getForeclosureTimeSafe(steward, tokenPatron);
  let timeSinceLastUpdate = txTimestamp.minus(patron.lastUpdated);
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
  currentTimestamp: BigInt
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

  stateChange.timestamp = currentTimestamp;
  stateChange.save();
}
