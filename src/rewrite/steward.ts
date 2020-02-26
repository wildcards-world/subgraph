import { BigInt, Address, log } from "@graphprotocol/graph-ts";
import { LogBuy, Steward, Buy } from "../../generated/Steward/Steward";
import { getTokenIdFromTxTokenPrice, isVintageVitalik } from "../v0/helpers";
import { PatronNew, WildcardNew } from "../../generated/schema";
import {
  VitalikStewardLegacy,
  LogBuy as LogBuyLegacy
} from "../../generated/VitalikStewardLegacy/VitalikStewardLegacy";
import {
  GLOBAL_PATRONAGE_DENOMINATOR,
  NUM_SECONDS_IN_YEAR_BIG_INT,
  VITALIK_PATRONAGE_NUMERATOR,
  VITALIK_PRICE_WHEN_OWNED_BY_SIMON
} from "../CONSTANTS";
// import { minBigInt } from "../util";

function createDefaultPatron(address: Address, txTimestamp: BigInt): PatronNew {
  let addressString = address.toHexString();
  let patron = new PatronNew(addressString);
  patron.address = address;
  patron.totalTimeHeld = BigInt.fromI32(0);
  patron.totalContributed = BigInt.fromI32(0);
  patron.patronTokenCostScaledNumerator = BigInt.fromI32(0);
  patron.tokens = [];
  patron.lastUpdated = txTimestamp;
  // patron.save();
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
  patron.totalContributed = BigInt.fromI32(0);
  patron.patronTokenCostScaledNumerator = BigInt.fromI32(0);
  patron.tokens = [];
  patron.lastUpdated = txTimestamp;
  // patron.save();
  return patron;
}

export function createWildcardIfDoesntExist(
  // steward: Steward,
  tokenId: BigInt
): WildcardNew {
  let wildcard = new WildcardNew(tokenId.toString());

  wildcard.tokenId = tokenId;
  wildcard.owner = "NO_OWNER";
  // wildcard.save();
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
  let tokenPrice = steward.price();
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

  let newPatronTotalContributed =
    patronOld.id != "NO_OWNER"
      ? patron.totalContributed.plus(
          patron.patronTokenCostScaledNumerator
            .times(timeSinceLastUpdatePatron)
            .div(GLOBAL_PATRONAGE_DENOMINATOR)
            .div(NUM_SECONDS_IN_YEAR_BIG_INT)
        )
      : BigInt.fromI32(0);
  let newPatronTokenCostScaledNumerator = VITALIK_PATRONAGE_NUMERATOR.times(
    tokenPrice
  );
  let oldPatronTotalContributed =
    patronOld.id != "NO_OWNER"
      ? patronOld.totalContributed.plus(
          patronOld.patronTokenCostScaledNumerator
            .times(timeSinceLastUpdatePatron)
            .div(GLOBAL_PATRONAGE_DENOMINATOR)
            .div(NUM_SECONDS_IN_YEAR_BIG_INT)
        )
      : BigInt.fromI32(0);
  let oldPatronTokenCostScaledNumerator = BigInt.fromI32(0);

  let newPatronTokenArray = patron.tokens.concat([wildcard.id]);
  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  let oldPatronTokenArray = patronOld.tokens
    .slice(0, itemIndex)
    .concat(patronOld.tokens.slice(itemIndex + 1, patronOld.tokens.length));

  // Phase 3: set+save values.

  patron.lastUpdated = txTimestamp;
  patron.totalTimeHeld = newPatronTotalTimeHeld;
  patron.tokens = newPatronTokenArray;
  patron.patronTokenCostScaledNumerator = newPatronTokenCostScaledNumerator;
  patron.totalContributed = newPatronTotalContributed;
  patron.save();

  patronOld.lastUpdated = txTimestamp;
  patronOld.totalTimeHeld = oldPatronTotalTimeHeld;
  patronOld.tokens = oldPatronTokenArray;
  patronOld.patronTokenCostScaledNumerator = oldPatronTokenCostScaledNumerator;
  patronOld.totalContributed = oldPatronTotalContributed;
  patronOld.save();

  wildcard.owner = ownerString;
  wildcard.save();
}

export function handleLogBuy(event: LogBuy): void {
  // This is a hack, but after spending 4 hours trying to work out why the
  //    "0x3ea1ecb8775a37fb797bb79f6c419176f15e35d4" wildcards address is
  //    still being created (when I bought back vitalik as a test for Simon).
  //    Theoritically this should be caught by the `isVitalik` section, but for some reason it isn't.
  if (
    event.transaction.hash.toHexString() ==
    "0x8961f14a43c82842d5541da454b44aad64cbbe11b2f9094d6dc191bce3eac2f3"
  ) {
    return;
  }

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

  let newPatronTotalContributed =
    patronOld.id != "NO_OWNER"
      ? patron.totalContributed.plus(
          patron.patronTokenCostScaledNumerator
            .times(timeSinceLastUpdatePatron)
            .div(GLOBAL_PATRONAGE_DENOMINATOR)
            .div(NUM_SECONDS_IN_YEAR_BIG_INT)
        )
      : BigInt.fromI32(0);
  let newPatronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    owner
  );
  let oldPatronTotalContributed =
    patronOld.id != "NO_OWNER"
      ? patronOld.totalContributed.plus(
          patronOld.patronTokenCostScaledNumerator
            .times(timeSinceLastUpdatePatron)
            .div(GLOBAL_PATRONAGE_DENOMINATOR)
            .div(NUM_SECONDS_IN_YEAR_BIG_INT)
        )
      : BigInt.fromI32(0);
  let oldPatronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    owner
  );

  let newPatronTokenArray = patron.tokens.concat([wildcard.id]);
  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  let oldPatronTokenArray = patronOld.tokens
    .slice(0, itemIndex)
    .concat(patronOld.tokens.slice(itemIndex + 1, patronOld.tokens.length));

  if (isVintageVitalik(tokenIdBigInt, event.block.number)) {
    // BE VERY CAREFUL HERE, there was an issue upgrading vitalik that we must take into account.
    // This was the transaction that simon upgraded vitalik (so the deposit was updated!)
    // Over here do all the accounting necessary for the upgrade.
    if (
      event.transaction.hash.toHexString() !=
      "0x819abe91008e8e22034b57efcff070c26690cbf55b7640bea6f93ffc26184d90"
    ) {
      let newPatronTokenCostScaledNumerator = VITALIK_PATRONAGE_NUMERATOR.times(
        VITALIK_PRICE_WHEN_OWNED_BY_SIMON
      );
      let newPatronTotalContributed = patron.totalContributed.plus(
        newPatronTokenCostScaledNumerator
          .times(timeSinceLastUpdatePatron)
          .div(GLOBAL_PATRONAGE_DENOMINATOR)
          .div(NUM_SECONDS_IN_YEAR_BIG_INT)
      );
      patron.lastUpdated = txTimestamp;
      patron.totalTimeHeld = newPatronTotalTimeHeld;
      patron.tokens = newPatronTokenArray;
      patron.patronTokenCostScaledNumerator = newPatronTokenCostScaledNumerator;
      patron.totalContributed = newPatronTotalContributed;

      patron.save();
    }
    return;
  }

  // Phase 3: set+save values.

  patron.lastUpdated = txTimestamp;
  patron.totalTimeHeld = newPatronTotalTimeHeld;
  patron.tokens = newPatronTokenArray;
  patron.patronTokenCostScaledNumerator = newPatronTokenCostScaledNumerator;
  patron.totalContributed = newPatronTotalContributed;
  patron.save();

  patronOld.lastUpdated = txTimestamp;
  patronOld.totalTimeHeld = oldPatronTotalTimeHeld;
  patronOld.tokens = oldPatronTokenArray;
  patronOld.patronTokenCostScaledNumerator = oldPatronTokenCostScaledNumerator;
  patronOld.totalContributed = oldPatronTotalContributed;
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

  let newPatronTotalContributed =
    patronOld.id != "NO_OWNER"
      ? patron.totalContributed.plus(
          patron.patronTokenCostScaledNumerator
            .times(timeSinceLastUpdatePatron)
            .div(GLOBAL_PATRONAGE_DENOMINATOR)
            .div(NUM_SECONDS_IN_YEAR_BIG_INT)
        )
      : BigInt.fromI32(0);
  let newPatronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    owner
  );
  let oldPatronTotalContributed =
    patronOld.id != "NO_OWNER"
      ? patronOld.totalContributed.plus(
          patronOld.patronTokenCostScaledNumerator
            .times(timeSinceLastUpdatePatron)
            .div(GLOBAL_PATRONAGE_DENOMINATOR)
            .div(NUM_SECONDS_IN_YEAR_BIG_INT)
        )
      : BigInt.fromI32(0);

  let oldPatronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    owner
  );

  let newPatronTokenArray = patron.tokens.concat([wildcard.id]);
  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  let oldPatronTokenArray = patronOld.tokens
    .slice(0, itemIndex)
    .concat(patronOld.tokens.slice(itemIndex + 1, patronOld.tokens.length));

  // Phase 3: set+save values.

  patron.lastUpdated = txTimestamp;
  patron.totalTimeHeld = newPatronTotalTimeHeld;
  patron.tokens = newPatronTokenArray;
  patron.patronTokenCostScaledNumerator = newPatronTokenCostScaledNumerator;
  patron.totalContributed = newPatronTotalContributed;
  patron.save();

  patronOld.lastUpdated = txTimestamp;
  patronOld.totalTimeHeld = oldPatronTotalTimeHeld;
  patronOld.tokens = oldPatronTokenArray;
  patronOld.patronTokenCostScaledNumerator = oldPatronTokenCostScaledNumerator;
  patronOld.totalContributed = oldPatronTotalContributed;
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

  // Phase 3: set+save values.

  patron.lastUpdated = txTimestamp;
  patron.totalTimeHeld = newPatronTotalTimeHeld;
  patron.save();

  wildcard.owner = ownerString;
  wildcard.save();
}
