import {
  AddToken,
  Steward,
  UpgradeToV3,
} from "../../generated/Steward/Steward";
import { log, BigInt } from "@graphprotocol/graph-ts";
import { Wildcard, Global } from "../../generated/schema";
import { handleAddTokenUtil, recognizeStateChange } from "../util";
/*
// deprecated_totalCollected; // THIS VALUE IS DEPRECATED
    - 
// deprecated_currentCollected; // THIS VALUE IS DEPRECATED
// deprecated_timeLastCollected; // THIS VALUE IS DEPRECATED.
// deprecated_currentPatron; // Deprecate This is different to the current token owner.
// deprecated_patrons; // Deprecate
// deprecated_timeHeld; // Deprecate
// deprecated_timeAcquired; // deprecate
// deprecated_tokenGenerationRate; // we can reuse the patronage denominator
*/
export function handleUpgradeToV3(event: UpgradeToV3): void {
  log.warning("UpgradeToV3 was called!!! BLOCK - {}; HASH - {}.", [
    event.block.number.toString(),
    event.block.hash.toHexString(),
  ]);

  let globalState = Global.load("1");
  if (globalState == null) {
    log.critical("The global state is undefined!", []);
  }

  globalState.version = BigInt.fromI32(3);

  globalState.save();
}

export function handleAddToken(event: AddToken): void {
  // let tokenId = event.params.tokenId;
  // let txTimestamp = event.block.timestamp;
  // let txHashString = event.transaction.hash.toHexString();
  // let patronageNumerator = event.params.patronageNumerator;
  // let wildcard = new Wildcard(tokenId.toString());
  // let steward = Steward.bind(event.address);
  // let txHashStr = event.transaction.hash.toHexString();
  // handleAddTokenUtil(
  //   tokenId,
  //   txTimestamp,
  //   patronageNumerator,
  //   wildcard,
  //   steward,
  //   txHashStr
  // );
  // recognizeStateChange(
  //   txHashString,
  //   "handleAddToken",
  //   // NOTE: leaving these null because they will be updated by the other tokens
  //   [],
  //   [],
  //   txTimestamp
  // );
}
