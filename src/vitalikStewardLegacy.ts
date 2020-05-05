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
} from "./CONSTANTS";
import { minBigInt, removeFromArrayAtIndex } from "./util";
import { handleLogBuyVitalikLegacy } from "./rewrite/steward";

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

  let tokenId = 42;
  let tokenIdString = "42";

  let wildcard = Wildcard.load(tokenIdString);

  // Entity fields can be set using simple assignments
  wildcard.tokenId = BigInt.fromI32(tokenId);

  wildcard.priceHistory = wildcard.priceHistory.concat([wildcard.price]);

  let patron = Patron.load(ownerString);
  let patronOld = Patron.load(wildcard.owner);
  if (patron == null) {
    patron = new Patron(ownerString);
    patron.address = owner;
    patron.totalTimeHeld = BigInt.fromI32(0);
    patron.totalContributed = BigInt.fromI32(0);
    patron.patronTokenCostScaledNumerator = BigInt.fromI32(0);
    patron.tokens = [];
    patron.previouslyOwnedTokens = [];
    patron.lastUpdated = txTimestamp;
  }

  // Add to previouslyOwnedTokens if not already there
  patron.previouslyOwnedTokens =
    patron.previouslyOwnedTokens.indexOf(wildcard.id) === -1
      ? patron.previouslyOwnedTokens.concat([wildcard.id])
      : patron.previouslyOwnedTokens;
  // Add token to the patrons currently held tokens
  patron.tokens =
    patron.tokens.indexOf(wildcard.id) === -1 // In theory this should ALWAYS be false.
      ? patron.previouslyOwnedTokens.concat([wildcard.id])
      : patron.previouslyOwnedTokens;

  let steward = VitalikStewardLegacy.bind(event.address);
  patron.lastUpdated = txTimestamp;
  patron.availableDeposit = steward.depositAbleToWithdraw();
  patron.patronTokenCostScaledNumerator = newPrice.times(
    wildcard.patronageNumerator
  );
  patron.foreclosureTime = getForeclosureTimeSafe(steward);
  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  if (patronOld.id != "NO_OWNER") {
    // NOTE: we are safe to only update totalContibuted for `patronOld` here and not also `patron`
    //       since only Simon owned Vitalik before the vintage contract was deprecated.
    let heldUntil = minBigInt(patronOld.foreclosureTime, txTimestamp);
    let timeSinceLastUpdateOldPatron = heldUntil.minus(patronOld.lastUpdated);
    patronOld.totalTimeHeld = patron.totalTimeHeld.plus(
      timeSinceLastUpdateOldPatron.times(
        BigInt.fromI32(patronOld.tokens.length)
      )
    );

    // Remove token to the previous patron's tokens
    patronOld.tokens = removeFromArrayAtIndex(patronOld.tokens, itemIndex);

    patronOld.totalContributed = patron.totalContributed.plus(
      patronOld.patronTokenCostScaledNumerator
        .times(timeSinceLastUpdateOldPatron)
        .div(VITALIK_PATRONAGE_DENOMINATOR)
        .div(NUM_SECONDS_IN_YEAR_BIG_INT)
    );
    patronOld.patronTokenCostScaledNumerator = BigInt.fromI32(0);
    patronOld.availableDeposit = steward.depositAbleToWithdraw();
    patronOld.foreclosureTime = getForeclosureTimeSafe(steward);
    patronOld.lastUpdated = txTimestamp;
  }

  // NOTE: Case where someone buys the token from themselves.
  //       Effectively that is the same as just changing the price.
  if (ownerString == patronOld.id) {
    // TODO: we need to methodically go through all the parameters of patron and make sure it is correct doing it like this.
    patron.save();
  } else {
    patronOld.save();
    patron.save();
  }

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

  wildcard.price = price.id;

  wildcard.patronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );

  wildcard.owner = patron.id;
  wildcard.timeAcquired = txTimestamp;

  wildcard.save();

  // the new code:
  handleLogBuyVitalikLegacy(event);
}

export function handleLogPriceChange(event: LogPriceChange): void {
  if (returnIfNewVitalik(event.block.number)) {
    return;
  }
  let tokenId = 42;
  let tokenIdString = tokenId.toString();
  let newPrice = event.params.newPrice;
  let txTimestamp = event.block.timestamp;

  let wildcard = Wildcard.load(tokenIdString);

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (wildcard == null) {
    wildcard = new Wildcard(tokenIdString);
    wildcard.totalCollected = BigInt.fromI32(0);
  }

  // let globalState = Global.load("1")

  // // // Entities only exist after they have been saved to the store;
  // // // `null` checks allow to create entities on demand
  // if (globalState == null) {
  //   globalState = new Global("1")
  //   globalState.totalCollected = BigInt.fromI32(0)
  // }

  // Entity fields can be set using simple assignments
  wildcard.tokenId = BigInt.fromI32(tokenId);

  let price = new Price(event.transaction.hash.toHexString());
  price.price = newPrice;
  price.timeSet = txTimestamp;
  price.save();

  wildcard.price = price.id;
  wildcard.patronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );
  let steward = VitalikStewardLegacy.bind(event.address);
  wildcard.totalCollected = steward.totalCollected();

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
  let patronOld = Patron.load(foreclosedPatron);

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
  // let globalState = Global.load("1")

  let steward = VitalikStewardLegacy.bind(event.address);

  let tokenIdString = "42";

  let wildcard = Wildcard.load(tokenIdString);

  wildcard.totalCollected = steward.totalCollected();

  // globalState.totalCollected = globalState.totalCollected.plus(wildcard.totalCollected)
  // globalState.save()
}
