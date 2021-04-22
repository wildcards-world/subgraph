import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import { Steward } from "../../generated/Steward/Steward";
import { Wildcard, TokenUri, EventCounter } from "../../generated/schema";
import { Token } from "../../generated/Token/Token";
import { EVENT_COUNTER_ID, ID_PREFIX } from "../CONSTANTS";

/*
NOTE:
  These helper functions are legacy and only relevant to v0.
  The tokenId of the token involved was not included in the events emitted by this version and there fore we need to use different methods to get the token id.
*/
// A token would need to be set to the same price
export function getTokenIdFromTxTokenPrice(
  steward: Steward,
  tokenPrice: BigInt,
  owner: Address,
  timestamp: BigInt,
  txHash: Bytes
): i32 {
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
    let txHashString = txHash.toHexString();
    if (
      txHashString ==
      "0x09ba3e91dd1291ff66f2cf66c0b72cff74f302065f80687083d364a425c82891"
    ) {
      // https://goerli.etherscan.io/tx/0x09ba3e91dd1291ff66f2cf66c0b72cff74f302065f80687083d364a425c82891
      return 2;
    }
    // QUESTION: Why are the following two transactions not being caught? Did they foreclose immediately due to the buyers other tokens? These tokens doesn't foreclose when bought.
    else if (
      txHashString ==
      "0x5a2d0650fcd9ea20f17de40d4417d6f5ef9cbf7cf93a616d429e8ab1b2f05bbf"
    ) {
      // https://goerli.etherscan.io/tx/0x5a2d0650fcd9ea20f17de40d4417d6f5ef9cbf7cf93a616d429e8ab1b2f05bbf
      return 0;
    } else if (
      txHashString ==
      "0xc0e1c0a5707e803345b48419f90cec9d5308eff88b4e56196732455d6b53c4bf"
    ) {
      // https://goerli.etherscan.io/tx/0xc0e1c0a5707e803345b48419f90cec9d5308eff88b4e56196732455d6b53c4bf
      return 2;
    }
    return -1; // THIS CONDITION SHOULD NEVER BE REACHED!
  }
}
// A token would need to be set to the same price
export function getTokenIdFromTimestamp(
  steward: Steward,
  timestamp: BigInt,
  txHash: Bytes
  // TODO: might need to add a variable here of txhash, and match on txhash if the token was foreclosed (since foreclosed tokens have a different timeLastCollected to the trasnaction time stamp)
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
    // if it doesn't match the time last collected it means the token was foreclosed.
    //   (since foreclosed tokens have a different timeLastCollected to the trasnaction time stamp)
    //   - here as a last resort we match on transaction hash:
    if (
      txHash.toHexString() ==
      "0x355a2bd0c5e2432a12833ffc01435e18923c3b9dd3fe41353fd946366820df02"
    ) {
      // https://goerli.etherscan.io/tx/0x355a2bd0c5e2432a12833ffc01435e18923c3b9dd3fe41353fd946366820df02
      return 11;
    } else if (
      txHash.toHexString() ==
      "0x283f8cd6175afd6f9cf78b6ffe92173b3aeea53b3570629331ae3e152d5e22a9"
    ) {
      // https://goerli.etherscan.io/tx/0x283f8cd6175afd6f9cf78b6ffe92173b3aeea53b3570629331ae3e152d5e22a9
      return 42;
    } else if (
      txHash.toHexString() ==
      "0xc0e1c0a5707e803345b48419f90cec9d5308eff88b4e56196732455d6b53c4bf"
    ) {
      // Actually something strange happened in this transaction - not sure why it isn't catching. It is a buy transaction.
      // https://goerli.etherscan.io/tx/0xc0e1c0a5707e803345b48419f90cec9d5308eff88b4e56196732455d6b53c4bf
      return 3;
    } else {
      // This should case should never be reached, match on txHash first!
      return -1;
    }
  }
}

export function createCounterIfDoesntExist(): void {
  let eventCounter = EventCounter.load(EVENT_COUNTER_ID);
  if (eventCounter != null) {
    // if eventCounter has already been created return it
    return;
  }
  eventCounter = new EventCounter(EVENT_COUNTER_ID);
  eventCounter.buyEventCount = BigInt.fromI32(0);
  eventCounter.changePriceEventCount = BigInt.fromI32(0);
  eventCounter.buyEvents = [];
  eventCounter.stateChanges = [];
  eventCounter.save();
}

// TODO: this creation function should be shared between all the code.
export function createWildcardIfDoesntExist(
  steward: Steward,
  tokenId: BigInt,
  time: BigInt
): Wildcard {
  let wildcard = new Wildcard(ID_PREFIX + tokenId.toString());
  wildcard.launchTime = time;

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
