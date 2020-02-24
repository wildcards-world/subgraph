import { BigInt, Address, log } from "@graphprotocol/graph-ts";
import { LogBuy, Steward, Buy } from "../../generated/Steward/Steward";
import { getTokenIdFromTxTokenPrice, isVintageVitalik } from "../v0/helpers";
import { PatronNew, WildcardNew } from "../../generated/schema";
import {
  VitalikStewardLegacy,
  LogBuy as LogBuyLegacy
} from "../../generated/VitalikStewardLegacy/VitalikStewardLegacy";
// import { minBigInt } from "../util";

function createDefaultPatron(address: Address, txTimestamp: BigInt): PatronNew {
  let addressString = address.toHexString();
  let patron = new PatronNew(addressString);
  patron.address = address;
  patron.totalTimeHeld = BigInt.fromI32(0);
  patron.tokens = [];
  patron.lastUpdated = txTimestamp;
  patron.save();
  return patron;
}
function createNO_OWNERPatron(
  address: Address,
  txTimestamp: BigInt
): PatronNew {
  let addressString = address.toHexString();
  let patron = new PatronNew("NO_OWNER");
  patron.address = address;
  patron.totalTimeHeld = BigInt.fromI32(0);
  patron.tokens = [];
  patron.lastUpdated = txTimestamp;
  patron.save();
  return patron;
}

export function createWildcardIfDoesntExist(
  // steward: Steward,
  tokenId: BigInt
): WildcardNew {
  let wildcard = new WildcardNew(tokenId.toString());

  wildcard.tokenId = tokenId;
  wildcard.owner = "NO_OWNER";
  wildcard.save();
  return wildcard;
}

export function handleLogBuyVitalikLegacy(event: LogBuyLegacy): void {
  // PART 1: reading and getting values.
  let owner = event.params.owner;
  let ownerString = owner.toHexString();
  const txTimestamp = event.block.timestamp;

  // NOTE:: This is a bit hacky since LogBuy event doesn't include token ID.
  //        Get both patrons (since we don't know which one it is - didn't catch this at design time)
  let steward = VitalikStewardLegacy.bind(event.address);
  let tokenId = 42;
  let tokenIdString = tokenId.toString();
  let tokenIdBigInt = BigInt.fromI32(tokenId);

  let patron = PatronNew.load(ownerString);
  if (patron == null) {
    patron = createDefaultPatron(owner, txTimestamp);
  }

  let wildcard = WildcardNew.load(tokenIdString);
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(tokenIdBigInt);
  }

  let previousTokenOwner = wildcard.owner;
  let patronOld = PatronNew.load(previousTokenOwner);
  if (patronOld == null) {
    patronOld = createNO_OWNERPatron(owner, txTimestamp);
  }

  // Phase 2: calculate new values.

  // Now even if the patron puts in extra deposit when they buy a new token this will foreclose their old tokens.
  let heldUntilNewPatron = txTimestamp; //minBigInt(patron.foreclosureTime, txTimestamp); // TODO: use min with foreclosureTime
  let heldUntilPreviousPatron = txTimestamp; //minBigInt(patron.foreclosureTime, txTimestamp); // TODO: use min with foreclosureTime

  let timeSinceLastUpdatePatron = heldUntilNewPatron.minus(patron.lastUpdated);
  let timeSinceLastUpdatePreviousPatron = heldUntilPreviousPatron.minus(
    patronOld.lastUpdated
  );

  let newPatronTotalTimeHeld =
    patron.id != "NO_OWNER"
      ? patron.totalTimeHeld.plus(
          timeSinceLastUpdatePatron.times(BigInt.fromI32(patron.tokens.length))
        )
      : BigInt.fromI32(0);
  let oldPatronTotalTimeHeld =
    patronOld.id != "NO_OWNER"
      ? patronOld.totalTimeHeld.plus(
          timeSinceLastUpdatePreviousPatron.times(
            BigInt.fromI32(patronOld.tokens.length)
          )
        )
      : BigInt.fromI32(0);

  let newPatronTokenArray = patron.tokens.concat([wildcard.id]);
  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  let oldPatronTokenArray = patronOld.tokens
    .slice(0, itemIndex)
    .concat(patronOld.tokens.slice(itemIndex + 1, patronOld.tokens.length));

  // Phave 3: set+save values.

  patron.lastUpdated = txTimestamp;
  patron.totalTimeHeld = newPatronTotalTimeHeld;
  patron.tokens = newPatronTokenArray;
  patron.save();

  patronOld.lastUpdated = txTimestamp;
  patronOld.totalTimeHeld = oldPatronTotalTimeHeld;
  patronOld.tokens = oldPatronTokenArray;
  patronOld.save();

  wildcard.owner = ownerString;
  wildcard.save();
}

export function handleLogBuy(event: LogBuy): void {
  // PART 1: reading and getting values.
  let owner = event.params.owner;
  let ownerString = owner.toHexString();
  const txTimestamp = event.block.timestamp;

  // NOTE:: This is a bit hacky since LogBuy event doesn't include token ID.
  //        Get both patrons (since we don't know which one it is - didn't catch this at design time)
  let steward = Steward.bind(event.address);
  let tokenId = getTokenIdFromTxTokenPrice(
    steward,
    event.params.price,
    owner,
    txTimestamp
  );
  let tokenIdString = tokenId.toString();
  let tokenIdBigInt = BigInt.fromI32(tokenId);

  let patron = PatronNew.load(ownerString);
  if (patron == null) {
    patron = createDefaultPatron(owner, txTimestamp);
  }

  let wildcard = WildcardNew.load(tokenIdString);
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(tokenIdBigInt);
  }

  let previousTokenOwner = wildcard.owner;
  let patronOld = PatronNew.load(previousTokenOwner);
  if (patronOld == null) {
    patronOld = createNO_OWNERPatron(owner, txTimestamp);
  }

  // Phase 2: calculate new values.

  // Now even if the patron puts in extra deposit when they buy a new token this will foreclose their old tokens.
  let heldUntilNewPatron = txTimestamp; //minBigInt(patron.foreclosureTime, txTimestamp); // TODO: use min with foreclosureTime
  let heldUntilPreviousPatron = txTimestamp; //minBigInt(patron.foreclosureTime, txTimestamp); // TODO: use min with foreclosureTime

  let timeSinceLastUpdatePatron = heldUntilNewPatron.minus(patron.lastUpdated);
  let timeSinceLastUpdatePreviousPatron = heldUntilPreviousPatron.minus(
    patronOld.lastUpdated
  );

  let newPatronTotalTimeHeld =
    patron.id != "NO_OWNER"
      ? patron.totalTimeHeld.plus(
          timeSinceLastUpdatePatron.times(BigInt.fromI32(patron.tokens.length))
        )
      : BigInt.fromI32(0);
  let oldPatronTotalTimeHeld =
    patronOld.id != "NO_OWNER"
      ? patronOld.totalTimeHeld.plus(
          timeSinceLastUpdatePreviousPatron.times(
            BigInt.fromI32(patronOld.tokens.length)
          )
        )
      : BigInt.fromI32(0);

  let newPatronTokenArray = patron.tokens.concat([wildcard.id]);
  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  let oldPatronTokenArray = patronOld.tokens
    .slice(0, itemIndex)
    .concat(patronOld.tokens.slice(itemIndex + 1, patronOld.tokens.length));

  if (isVintageVitalik(tokenIdBigInt, event.block.number)) {
    // BE VERY CAREFUL HERE, there was an issue upgrading vitalik that we must take into account.
    // This was the transaction that simon upgraded vitalik (so the deposit was updated!)
    // if (
    //   event.transaction.hash.toHexString() !=
    //   "0x819abe91008e8e22034b57efcff070c26690cbf55b7640bea6f93ffc26184d90"
    // ) {
    return;
    // }
  }

  // Phave 3: set+save values.

  patron.lastUpdated = txTimestamp;
  patron.totalTimeHeld = newPatronTotalTimeHeld;
  patron.tokens = newPatronTokenArray;
  patron.save();

  patronOld.lastUpdated = txTimestamp;
  patronOld.totalTimeHeld = oldPatronTotalTimeHeld;
  patronOld.tokens = oldPatronTokenArray;
  patronOld.save();

  wildcard.owner = ownerString;
  wildcard.save();
}

export function handleBuy(event: Buy): void {
  // PART 1: reading and getting values.
  let owner = event.params.owner;
  let ownerString = owner.toHexString();
  const txTimestamp = event.block.timestamp;

  let steward = Steward.bind(event.address);
  let tokenIdBigInt = event.params.tokenId;
  let tokenIdString = tokenIdBigInt.toString();

  let patron = PatronNew.load(ownerString);
  if (patron == null) {
    patron = createDefaultPatron(owner, txTimestamp);
  }

  let wildcard = WildcardNew.load(tokenIdString);
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(tokenIdBigInt);
  }

  let previousTokenOwner = wildcard.owner;
  let patronOld = PatronNew.load(previousTokenOwner);
  if (patronOld == null) {
    patronOld = createNO_OWNERPatron(owner, txTimestamp);
  }

  // Phase 2: calculate new values.

  // Now even if the patron puts in extra deposit when they buy a new token this will foreclose their old tokens.
  let heldUntilNewPatron = txTimestamp; //minBigInt(patron.foreclosureTime, txTimestamp); // TODO: use min with foreclosureTime
  let heldUntilPreviousPatron = txTimestamp; //minBigInt(patron.foreclosureTime, txTimestamp); // TODO: use min with foreclosureTime

  let timeSinceLastUpdatePatron = heldUntilNewPatron.minus(patron.lastUpdated);
  let timeSinceLastUpdatePreviousPatron = heldUntilPreviousPatron.minus(
    patronOld.lastUpdated
  );

  let newPatronTotalTimeHeld =
    patron.id != "NO_OWNER"
      ? patron.totalTimeHeld.plus(
          timeSinceLastUpdatePatron.times(BigInt.fromI32(patron.tokens.length))
        )
      : BigInt.fromI32(0);
  let oldPatronTotalTimeHeld =
    patronOld.id != "NO_OWNER"
      ? patronOld.totalTimeHeld.plus(
          timeSinceLastUpdatePreviousPatron.times(
            BigInt.fromI32(patronOld.tokens.length)
          )
        )
      : BigInt.fromI32(0);

  let newPatronTokenArray = patron.tokens.concat([wildcard.id]);
  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  let oldPatronTokenArray = patronOld.tokens
    .slice(0, itemIndex)
    .concat(patronOld.tokens.slice(itemIndex + 1, patronOld.tokens.length));

  // Phave 3: set+save values.

  patron.lastUpdated = txTimestamp;
  patron.totalTimeHeld = newPatronTotalTimeHeld;
  patron.tokens = newPatronTokenArray;
  patron.save();

  patronOld.lastUpdated = txTimestamp;
  patronOld.totalTimeHeld = oldPatronTotalTimeHeld;
  patronOld.tokens = oldPatronTokenArray;
  patronOld.save();

  wildcard.owner = ownerString;
  wildcard.save();
}

export function genericUpdateTimeHeld(
  owner: Address,
  txTimestamp: BigInt,
  steward: Steward,
  tokenIdBigInt: BigInt
): void {
  // PART 1: reading and getting values.
  let ownerString = owner.toHexString();

  let tokenIdString = tokenIdBigInt.toString();

  let patron = PatronNew.load(ownerString);
  if (patron == null) {
    patron = createDefaultPatron(owner, txTimestamp);
  }

  let wildcard = WildcardNew.load(tokenIdString);
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(tokenIdBigInt);
  }

  // Phase 2: calculate new values.

  // Now even if the patron puts in extra deposit when they buy a new token this will foreclose their old tokens.
  let heldUntilNewPatron = txTimestamp; //minBigInt(patron.foreclosureTime, txTimestamp); // TODO: use min with foreclosureTime

  let timeSinceLastUpdatePatron = heldUntilNewPatron.minus(patron.lastUpdated);

  let newPatronTotalTimeHeld = patron.totalTimeHeld.plus(
    timeSinceLastUpdatePatron.times(BigInt.fromI32(patron.tokens.length))
  );

  // Phave 3: set+save values.

  patron.lastUpdated = txTimestamp;
  patron.totalTimeHeld = newPatronTotalTimeHeld;
  patron.save();

  wildcard.owner = ownerString;
  wildcard.save();
}
