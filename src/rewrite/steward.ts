import { BigInt, Address, log } from "@graphprotocol/graph-ts";
import { Steward } from "../../generated/Steward/Steward";
import { Patron, Wildcard } from "../../generated/schema";
import { initialiseDefaultPatronIfNull } from "../util";
import { createWildcardIfDoesntExist } from "../v0/helpers";
import { ID_PREFIX } from "../CONSTANTS";
export function genericUpdateTimeHeld(
  owner: Address,
  txTimestamp: BigInt,
  steward: Steward,
  tokenIdBigInt: BigInt
): void {
  // PART 1: reading and getting values.
  let ownerString = owner.toHexString();

  let tokenIdString = tokenIdBigInt.toString();

  let patron = Patron.load(ownerString);
  if (patron == null) {
    patron = initialiseDefaultPatronIfNull(steward, owner, txTimestamp);
  }

  let wildcard = Wildcard.load(ID_PREFIX + tokenIdString);
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(steward, tokenIdBigInt, txTimestamp);
  }

  // Phase 2: calculate new values.

  // Now even if the patron puts in extra deposit when they buy a new token this will foreclose their old tokens.
  let heldUntilNewPatron = txTimestamp; //minBigInt(patron.foreclosureTime, txTimestamp); // TODO: use min with foreclosureTime

  let timeSinceLastUpdatePatron = heldUntilNewPatron.minus(patron.lastUpdated);

  let newPatronTotalTimeHeld = patron.totalTimeHeld.plus(
    timeSinceLastUpdatePatron.times(BigInt.fromI32(patron.tokens.length))
  );
  let timePatronLastUpdated = steward.timeLastCollectedPatron(
    patron.address as Address
  );

  // Phase 3: set+save values.

  patron.lastUpdated = timePatronLastUpdated;
  patron.totalTimeHeld = newPatronTotalTimeHeld;
  patron.save();

  wildcard.owner = ownerString;
  wildcard.save();
}
