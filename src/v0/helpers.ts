import { BigInt, Address } from "@graphprotocol/graph-ts";
import {
  Steward,
  LogBuy,
  LogPriceChange,
  LogForeclosure,
  LogCollection,
  LogRemainingDepositUpdate,
  AddToken,
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
import {
  ZERO_ADDRESS,
  NUM_SECONDS_IN_YEAR,
  AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT,
  NUM_SECONDS_IN_YEAR_BIG_INT,
  BILLION,
  VITALIK_PATRONAGE_NUMERATOR,
  VITALIK_PATRONAGE_DENOMINATOR,
  GLOBAL_PATRONAGE_DENOMINATOR,
} from "../CONSTANTS";
import { getForeclosureTimeSafe, minBigInt } from "../util";
import {
  getTotalCollectedAccurate,
  getTotalOwedAccurate,
  getTotalTokenCostScaledNumerator,
} from "../util/hacky";

// A token would need to be set to the same price
export function getTokenIdFromTxTokenPrice(
  steward: Steward,
  tokenPrice: BigInt,
  owner: Address,
  timestamp: BigInt
): i32 {
  // if ("0x6b90b98733928136cb44675929ca5359d1a76417" == owner.toHexString()) {
  //   log.warning(
  //     "Matching Marvin's v0 token! timestamp: {} == {} ? \n ? tokenPrice: {} == {} ? \n ? owner: {} == {}",
  //     [
  //       timestamp.toString(),
  //       steward.timeLastCollected(BigInt.fromI32(0)).toString(),
  //       tokenPrice.toString(),
  //       steward.price(BigInt.fromI32(0)).toString(),
  //       owner.toString(),
  //       steward.currentPatron(BigInt.fromI32(0)).toString()
  //     ]
  //   );
  // }
  if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(0))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(0))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(0)))
  ) {
    return 0;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(1))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(1))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(1)))
  ) {
    return 1;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(2))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(2))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(2)))
  ) {
    return 2;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(3))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(3))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(3)))
  ) {
    return 3;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(4))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(4))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(4)))
  ) {
    return 4;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(5))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(5))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(5)))
  ) {
    return 5;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(6))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(6))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(6)))
  ) {
    return 6;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(7))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(7))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(7)))
  ) {
    return 7;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(8))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(8))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(8)))
  ) {
    return 8;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(9))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(9))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(9)))
  ) {
    return 9;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(10))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(10))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(10)))
  ) {
    return 10;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(11))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(11))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(11)))
  ) {
    return 11;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(12))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(12))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(12)))
  ) {
    return 12;
  } else if (
    timestamp.equals(steward.timeLastCollected(BigInt.fromI32(42))) &&
    tokenPrice.equals(steward.price(BigInt.fromI32(42))) &&
    owner.equals(steward.currentPatron(BigInt.fromI32(42)))
  ) {
    return 42;
  } else {
    return -1; // a random non-released token -- this normally means the token was foreclosed or something like that
  }
}
// A token would need to be set to the same price
export function getTokenIdFromTimestamp(
  steward: Steward,
  timestamp: BigInt
): i32 {
  // NOTE: this code is broken for token foreclosures!
  if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(0)))) {
    return 0;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(1)))) {
    return 1;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(2)))) {
    return 2;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(3)))) {
    return 3;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(4)))) {
    return 4;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(5)))) {
    return 5;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(6)))) {
    return 6;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(7)))) {
    return 7;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(8)))) {
    return 8;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(9)))) {
    return 9;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(10)))) {
    return 10;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(11)))) {
    return 11;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(12)))) {
    return 12;
  } else if (timestamp.equals(steward.timeLastCollected(BigInt.fromI32(42)))) {
    return 42;
  } else {
    return -1; // a random non-released token -- this normally means the token was foreclosed or something like that
  }
}

export function isVintageVitalik(
  tokenId: BigInt,
  blockNumber: BigInt
): boolean {
  return (
    tokenId.equals(BigInt.fromI32(42)) &&
    blockNumber.lt(BigInt.fromI32(9077429))
  ); // block 9077422 is the block that Vitalik was mined at.
}

export function createCounterIfDoesntExist(): void {
  let eventCounter = EventCounter.load("1");
  if (eventCounter != null) {
    // if eventCounter has already been created return it
    return;
  }
  eventCounter = new EventCounter("1");
  eventCounter.buyEventCount = BigInt.fromI32(0);
  eventCounter.changePriceEventCount = BigInt.fromI32(0);
  eventCounter.buyEvents = [];
  eventCounter.stateChanges = [];
  eventCounter.save();
}
export function createWildcardIfDoesntExist(
  steward: Steward,
  tokenId: BigInt
): Wildcard {
  let wildcard = new Wildcard(tokenId.toString());

  let tokenAddress = steward.assetToken();
  let erc721 = Token.bind(tokenAddress);

  let tokenInfo = erc721.tokenURI(tokenId);

  // Entity fields can be set using simple assignments
  let tokenUri = new TokenUri(tokenId.toString());
  tokenUri.uriString = tokenInfo;
  tokenUri.save();

  wildcard.tokenUri = tokenUri.id;
  return wildcard;
}
