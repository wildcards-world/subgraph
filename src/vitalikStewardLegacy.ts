import { BigInt, Address, log } from "@graphprotocol/graph-ts";
import {
  VitalikStewardLegacy,
  LogBuy,
  LogPriceChange,
  LogForeclosure,
  LogCollection,
} from "../generated/VitalikStewardLegacy/VitalikStewardLegacy";
import {
  Wildcard,
  Patron,
  PreviousPatron,
  Price,
  Global,
} from "../generated/schema";
import {
  VITALIK_PATRONAGE_DENOMINATOR,
  NUM_SECONDS_IN_YEAR_BIG_INT,
  VITALIK_TOKEN_ID,
  GLOBAL_PATRONAGE_DENOMINATOR,
  VITALIK_PATRONAGE_NUMERATOR,
  ID_PREFIX,
} from "./CONSTANTS";
import {
  minBigInt,
  removeFromArrayAtIndex,
  initialiseNoOwnerPatronIfNull,
} from "./util";

function returnIfNewVitalik(blockNumber: BigInt): boolean {
  return blockNumber.gt(BigInt.fromI32(9077271)); // block 9077272 is the block that Vitalik was "exit"ed from the old contract.
}

export function getForeclosureTimeSafe(steward: VitalikStewardLegacy): BigInt {
  // NOTE:: since this contract is deprecated, always return 0 here, to avoid causing conflicts with the new contracts
  // let tryForeclosureTime = steward.try_foreclosureTime(); // this call can error if the combined price of the patrons token is zero (divide by zero error)!
  // if (tryForeclosureTime.reverted) {
  //   return BigInt.fromI32(0);
  // } else {
  //   return tryForeclosureTime.value;
  // }
  return BigInt.fromI32(0);
}

export function handleLogBuy(event: LogBuy): void {
  if (returnIfNewVitalik(event.block.number)) {
    return;
  }

  let owner = event.params.owner;
  let newPrice = event.params.price;
  let txTimestamp = event.block.timestamp;
  let ownerString = owner.toHexString();

  let tokenIdString = "42";

  let wildcard = Wildcard.load(ID_PREFIX + tokenIdString);

  // Entity fields can be set using simple assignments
  let wildcardPriceHistory = wildcard.priceHistory.concat([wildcard.price]);

  let patron = Patron.load(ID_PREFIX + ownerString);
  let patronOld = Patron.load(ID_PREFIX + wildcard.owner);
  if (patronOld == null) {
    patronOld = initialiseNoOwnerPatronIfNull();
  }

  if (patron == null) {
    patron = new Patron(ID_PREFIX + ownerString);
    patron.address = owner;
    patron.totalTimeHeld = BigInt.fromI32(0);
    patron.totalContributed = BigInt.fromI32(0);
    patron.patronTokenCostScaledNumerator = BigInt.fromI32(0);
    patron.tokens = [];
    patron.previouslyOwnedTokens = [];
    patron.lastUpdated = txTimestamp;
    patron.totalLoyaltyTokens = BigInt.fromI32(0);
    patron.totalLoyaltyTokensIncludingUnRedeemed = BigInt.fromI32(0);
    patron.currentBalance = BigInt.fromI32(0);
    patron.isMarkedAsForeclosed = true;
  }

  let steward = VitalikStewardLegacy.bind(event.address);

  // // PART 1: reading and getting values.
  // let owner = event.params.owner;
  // let ownerString = owner.toHexString();
  // let txTimestamp = event.block.timestamp;

  // // NOTE:: This is a bit hacky since LogBuy event doesn't include token ID.
  // //        Get both patrons (since we don't know which one it is - didn't catch this at design time)
  // let steward = VitalikStewardLegacy.bind(event.address);
  let tokenPrice = steward.price();
  // let tokenId = 42;
  // let tokenIdString = tokenId.toString();
  // let tokenIdBigInt = BigInt.fromI32(tokenId);

  // let patron = PatronNew.load(ownerString);
  // if (patron == null) {
  //   patron = createDefaultPatron(owner, txTimestamp);
  // }

  // let wildcard = WildcardNew.load(tokenIdString);
  // if (wildcard == null) {
  //   wildcard = createWildcardIfDoesntExist(tokenIdBigInt);
  // }

  // let previousTokenOwner = wildcard.owner;
  // let patronOld = PatronNew.load(previousTokenOwner);
  // if (patronOld == null) {
  //   patronOld = createNO_OWNERPatron(owner, txTimestamp);
  // }

  // Add to previouslyOwnedTokens if not already there
  let patronPreviouslyOwnedTokens =
    patron.previouslyOwnedTokens.indexOf(wildcard.id) === -1
      ? patron.previouslyOwnedTokens.concat([wildcard.id])
      : patron.previouslyOwnedTokens;

  let patronAvailableDeposit = steward.depositAbleToWithdraw();
  let patronForeclosureTime = getForeclosureTimeSafe(steward);
  // NOTE: we can only do this because Vitalik only had 1 owner while the multi token contract was deployed!
  let patronOldAvailableDeposit = BigInt.fromI32(0);
  let patronOldForeclosureTime = BigInt.fromI32(0);

  if (wildcard.owner !== "NO_OWNER") {
    let previousPatron = new PreviousPatron(ownerString);
    previousPatron.patron = patron.id;
    previousPatron.timeAcquired = wildcard.timeAcquired;
    previousPatron.timeSold = txTimestamp;
    previousPatron.save();

    wildcard.previousOwners = wildcard.previousOwners.concat([
      previousPatron.id,
    ]);
  }

  let price = new Price(event.transaction.hash.toHexString());
  price.price = newPrice;
  price.timeSet = txTimestamp;
  price.save();

  let wildcardPrice = price.id;
  let wildcardPatronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );
  let wildcardTimeAcquired = txTimestamp;

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

  let newPatronTokenCostScaledNumerator = newPrice.times(
    wildcard.patronageNumerator
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
  let oldPatronTokenArray = removeFromArrayAtIndex(patronOld.tokens, itemIndex);

  // Phase 3: set+save values.

  patron.previouslyOwnedTokens = patronPreviouslyOwnedTokens;
  patron.availableDeposit = patronAvailableDeposit;
  patron.foreclosureTime = patronForeclosureTime;
  patron.lastUpdated = txTimestamp;
  patron.totalTimeHeld = newPatronTotalTimeHeld;
  patron.tokens = newPatronTokenArray;
  patron.patronTokenCostScaledNumerator = newPatronTokenCostScaledNumerator;
  patron.totalContributed = newPatronTotalContributed;
  patron.save();

  if (patronOld.id != "NO_OWNER") {
    patronOld.lastUpdated = txTimestamp;
    patronOld.totalTimeHeld = oldPatronTotalTimeHeld;
    patronOld.tokens = oldPatronTokenArray;
    patronOld.patronTokenCostScaledNumerator = oldPatronTokenCostScaledNumerator;
    patronOld.totalContributed = oldPatronTotalContributed;
    patronOld.availableDeposit = patronOldAvailableDeposit;
    patronOld.foreclosureTime = patronOldForeclosureTime;
    patronOld.save();
  }
  wildcard.price = wildcardPrice;
  wildcard.currPrice = price.price;
  wildcard.patronageNumeratorPriceScaled = wildcardPatronageNumeratorPriceScaled;
  wildcard.timeAcquired = wildcardTimeAcquired;
  wildcard.priceHistory = wildcardPriceHistory;
  wildcard.owner = ownerString;
  wildcard.save();
}

export function handleLogPriceChange(event: LogPriceChange): void {
  log.warning("Vitalik price change", []);
  if (returnIfNewVitalik(event.block.number)) {
    return;
  }
  let tokenId = 42;
  let tokenIdString = tokenId.toString();
  let newPrice = event.params.newPrice;
  let txTimestamp = event.block.timestamp;

  let wildcard = Wildcard.load(ID_PREFIX + tokenIdString);

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (wildcard == null) {
    wildcard = new Wildcard(ID_PREFIX + tokenIdString);
    wildcard.totalCollected = BigInt.fromI32(0);
    wildcard.launchTime = txTimestamp;
  }

  // let globalState = Global.load(GLOBAL_ID)

  // // // Entities only exist after they have been saved to the store;
  // // // `null` checks allow to create entities on demand
  // if (globalState == null) {
  //   globalState = new Global(GLOBAL_ID)
  //   globalState.totalCollected = BigInt.fromI32(0)
  // }

  // Entity fields can be set using simple assignments
  wildcard.tokenId = BigInt.fromI32(tokenId);

  let price = new Price(event.transaction.hash.toHexString());
  price.price = newPrice;
  price.timeSet = txTimestamp;
  price.save();

  wildcard.price = price.id;
  wildcard.currPrice = price.price;
  wildcard.patronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );
  let steward = VitalikStewardLegacy.bind(event.address);
  wildcard.totalCollected = steward.totalCollected();

  wildcard.save();

  let patron = Patron.load(ID_PREFIX + wildcard.owner);
  if (patron == null) {
    log.warning("The patron PATRON, {}", [wildcard.owner]);
  }
  // TODO: this is wrong, it should be foreclosure time!
  let heldUntil = txTimestamp; //minBigInt(patron.foreclosureTime, txTimestamp);
  let timeSinceLastUpdate = heldUntil.minus(patron.lastUpdated);
  patron.totalTimeHeld = patron.totalTimeHeld.plus(
    timeSinceLastUpdate.times(BigInt.fromI32(patron.tokens.length))
  );
  patron.totalContributed = patron.totalContributed.plus(
    patron.patronTokenCostScaledNumerator
      .times(timeSinceLastUpdate)
      .div(VITALIK_PATRONAGE_DENOMINATOR)
      .div(NUM_SECONDS_IN_YEAR_BIG_INT)
  );
  patron.patronTokenCostScaledNumerator = newPrice.times(
    wildcard.patronageNumerator
  );
  patron.lastUpdated = txTimestamp;

  // globalState.totalCollected = globalState.totalCollected.plus(wildcard.totalCollected)
  // globalState.save()
}

export function handleLogForeclosure(event: LogForeclosure): void {
  if (returnIfNewVitalik(event.block.number)) {
    return;
  }

  /**
   * PHASE 1 - load data
   */
  // NOTE: keep in mind this is on the legacy vitalik contract. So only 1 token is foreclosing (not many)

  // TODO: this function isn't complete. Revisit.
  let foreclosedPatron = event.params.prevOwner.toHexString();
  let patronOld = Patron.load(ID_PREFIX + foreclosedPatron);

  let steward = VitalikStewardLegacy.bind(event.address);
  let wildcardIndexInPatronTokens = patronOld.tokens.indexOf(VITALIK_TOKEN_ID);

  // TODO: update Vitalik wildcard entity also.

  /**
   * PHASE 2 - update data
   */

  patronOld.tokens = removeFromArrayAtIndex(
    patronOld.tokens,
    wildcardIndexInPatronTokens
  );

  patronOld.lastUpdated = steward.timeLastCollected(); // TODO: double check this.
  // NOTE: this shouldn't be necessary, `previouslyOwnedTokens` is updated for the patron when the token is bought.
  patronOld.previouslyOwnedTokens =
    patronOld.previouslyOwnedTokens.indexOf(VITALIK_TOKEN_ID) === -1
      ? patronOld.previouslyOwnedTokens.concat([VITALIK_TOKEN_ID])
      : patronOld.previouslyOwnedTokens;

  /**
   * PHASE 3 - save data
   */
  patronOld.save();
}

export function handleLogCollection(event: LogCollection): void {
  // let globalState = Global.load(GLOBAL_ID)

  let steward = VitalikStewardLegacy.bind(event.address);

  let tokenIdString = "42";

  let wildcard = Wildcard.load(ID_PREFIX + tokenIdString);

  wildcard.totalCollected = steward.totalCollected();

  wildcard.save();

  // globalState.totalCollected = globalState.totalCollected.plus(wildcard.totalCollected)
  // globalState.save()
}
