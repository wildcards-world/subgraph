import { AddToken, Steward } from "../../generated/Steward/Steward";
import { Wildcard } from "../../generated/schema";
import { handleAddTokenUtil, saveEventToStateChange } from "../util";
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

  let eventParamValues: Array<string> = [
    event.params.tokenId.toString(),
    event.params.patronageNumerator.toString(),
    event.params.tokenGenerationRate.toString(),
  ];
  let eventParamNames: Array<string> = [
    "tokenId",
    "patronageNumerator",
    "tokenGenerationRate",
  ];

  let eventParamTypes: Array<string> = ["uint256", "uint256", "uint256"];

  saveEventToStateChange(
    event.transaction.hash,
    txTimestamp,
    event.block.number,
    "AddToken",
    eventParamValues,
    eventParamNames,
    eventParamTypes,
    [],
    [wildcard.id],
    2
  );
}
