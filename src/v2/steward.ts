import { AddToken, Steward } from "../../generated/Steward/Steward";
import { Wildcard } from "../../generated/schema";
import { handleAddTokenUtil, recognizeStateChange } from "../util";

export function handleAddToken(event: AddToken): void {
  let tokenId = event.params.tokenId;
  let txTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();

  let patronageNumerator = event.params.patronageNumerator;

  let wildcard = new Wildcard(tokenId.toString());

  let steward = Steward.bind(event.address);

  let txHashStr = event.transaction.hash.toHexString();

  handleAddTokenUtil(
    tokenId,
    txTimestamp,
    patronageNumerator,
    wildcard,
    steward,
    txHashStr
  );
  recognizeStateChange(
    txHashString,
    "handleAddToken",
    // NOTE: leaving these null because they will be updated by the other tokens
    [],
    [],
    txTimestamp
  );
}
