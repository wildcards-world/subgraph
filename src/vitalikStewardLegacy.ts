import { BigInt, Address, log } from "@graphprotocol/graph-ts";
import {
  VitalikStewardLegacy,
  LogBuy,
  LogPriceChange,
  LogForeclosure,
  LogCollection
} from "../generated/VitalikStewardLegacy/VitalikStewardLegacy";
import {
  Wildcard,
  Patron,
  PreviousPatron,
  Price,
  Global
} from "../generated/schema";
import {
  VITALIK_PATRONAGE_DENOMINATOR,
  NUM_SECONDS_IN_YEAR_BIG_INT
} from "./CONSTANTS";

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
  let timestamp = event.block.timestamp;
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
  }

  // Add to previouslyOwnedTokens if not already there
  patron.previouslyOwnedTokens =
    patron.previouslyOwnedTokens.indexOf(wildcard.id) === -1
      ? patron.previouslyOwnedTokens.concat([wildcard.id])
      : patron.previouslyOwnedTokens;
  // Add token to the patrons currently held tokens
  patron.tokens = patron.tokens.concat([wildcard.id]);
  let steward = VitalikStewardLegacy.bind(event.address);
  patron.lastUpdated = timestamp;
  patron.availableDeposit = steward.depositAbleToWithdraw();
  patron.patronTokenCostScaledNumerator = newPrice.times(
    wildcard.patronageNumerator
  );
  patron.foreclosureTime = getForeclosureTimeSafe(steward);
  let itemIndex = patronOld.tokens.indexOf(wildcard.id);
  // Remove token to the previous patron's tokens
  patronOld.tokens = patronOld.tokens
    .slice(0, itemIndex)
    .concat(patronOld.tokens.slice(itemIndex + 1, patronOld.tokens.length));
  patronOld.tokens = patronOld.tokens
    .slice(0, itemIndex)
    .concat(patronOld.tokens.slice(itemIndex + 1, patronOld.tokens.length));
  if (patronOld.id != "NO_OWNER") {
    patronOld.availableDeposit = steward.depositAbleToWithdraw();
    patronOld.foreclosureTime = getForeclosureTimeSafe(steward);
    // NOTE: we are safe to only update totalContibuted for `patronOld` here and not also `patron`
    //       since only Simon owned Vitalik before the vintage contract was deprecated.
    patronOld.totalContributed = patron.totalContributed.plus(
      patronOld.patronTokenCostScaledNumerator
        .times(timestamp.minus(patronOld.lastUpdated))
        .div(VITALIK_PATRONAGE_DENOMINATOR)
        .div(NUM_SECONDS_IN_YEAR_BIG_INT)
    );
    patronOld.patronTokenCostScaledNumerator = BigInt.fromI32(0);
    patronOld.lastUpdated = timestamp;
  }

  patron.save();
  patronOld.save();

  if (wildcard.owner !== "NO_OWNER") {
    let previousPatron = new PreviousPatron(ownerString);
    previousPatron.patron = patron.id;
    previousPatron.timeAcquired = wildcard.timeAcquired;
    previousPatron.timeSold = timestamp;
    previousPatron.save();

    wildcard.previousOwners = wildcard.previousOwners.concat([
      previousPatron.id
    ]);
  }

  let price = new Price(event.transaction.hash.toHexString());
  price.price = newPrice;
  price.timeSet = timestamp;
  price.save();

  wildcard.price = price.id;

  wildcard.patronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );

  wildcard.owner = patron.id;
  wildcard.timeAcquired = timestamp;

  wildcard.save();
}

export function handleLogPriceChange(event: LogPriceChange): void {
  if (returnIfNewVitalik(event.block.number)) {
    return;
  }
  let tokenId = 42;
  let tokenIdString = tokenId.toString();
  let newPrice = event.params.newPrice;
  let timestamp = event.block.timestamp;

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
  price.timeSet = timestamp;
  price.save();

  wildcard.price = price.id;
  wildcard.patronageNumeratorPriceScaled = wildcard.patronageNumerator.times(
    price.price
  );
  let steward = VitalikStewardLegacy.bind(event.address);
  wildcard.totalCollected = steward.totalCollected();

  wildcard.save();

  let patron = Patron.load(wildcard.owner);
  patron.totalContributed = patron.totalContributed.plus(
    patron.patronTokenCostScaledNumerator
      .times(timestamp.minus(patron.lastUpdated))
      .div(VITALIK_PATRONAGE_DENOMINATOR)
      .div(NUM_SECONDS_IN_YEAR_BIG_INT)
  );
  patron.patronTokenCostScaledNumerator = newPrice.times(
    wildcard.patronageNumerator
  );
  patron.lastUpdated = timestamp;

  // globalState.totalCollected = globalState.totalCollected.plus(wildcard.totalCollected)
  // globalState.save()
}

export function handleLogForeclosure(event: LogForeclosure): void {}

export function handleLogCollection(event: LogCollection): void {
  // let globalState = Global.load("1")

  let steward = VitalikStewardLegacy.bind(event.address);

  let tokenIdString = "42";

  let wildcard = Wildcard.load(tokenIdString);

  wildcard.totalCollected = steward.totalCollected();

  // globalState.totalCollected = globalState.totalCollected.plus(wildcard.totalCollected)
  // globalState.save()
}
