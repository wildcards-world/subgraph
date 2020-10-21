import { AddToken, Steward } from "../../generated/Steward/Steward";
import { Wildcard } from "../../generated/schema";
import { handleAddTokenUtil, recognizeStateChange } from "../util";
import { ID_PREFIX } from "../CONSTANTS";

export function handleAddToken(event: AddToken): void {
  let tokenId = event.params.tokenId;
  let txTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();

  let patronageNumerator = event.params.patronageNumerator;

  let wildcard = new Wildcard(ID_PREFIX + tokenId.toString());
  wildcard.launchTime = txTimestamp;

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

  let eventParamsString =
    "['" +
    event.params.tokenId.toString() +
    "', '" +
    event.params.patronageNumerator.toString() +
    "', '" +
    event.params.tokenGenerationRate.toString() +
    "']";

  recognizeStateChange(
    txHashString,
    "handleAddToken",
    eventParamsString,
    [],
    [],
    txTimestamp,
    event.block.number,
    2
  );
}
