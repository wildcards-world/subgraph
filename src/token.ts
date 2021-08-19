import { BigInt, log, Address } from "@graphprotocol/graph-ts";
import {
  Token,
  Init,
  MinterAdded,
  MinterRemoved,
  Transfer,
  Approval,
  ApprovalForAll,
} from "../generated/Token/Token";
import { Global } from "../generated/schema";
import {
  ZERO_ADDRESS,
  AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT,
  GLOBAL_ID,
} from "./CONSTANTS";

export function createGlobalState(
  timestamp: BigInt,
  erc721Address: Address
): Global {
  let globalState = new Global(GLOBAL_ID);
  globalState.version = BigInt.fromI32(0);
  globalState.timeLastCollected = timestamp;
  globalState.totalCollected = AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT;
  globalState.totalCollectedAccurate = globalState.totalCollected;
  // globalState.totalCollectedOrDue = globalState.totalCollected;
  globalState.totalCollectedOrDueAccurate = globalState.totalCollected;
  // globalState.totalTokenCostScaledNumerator = BigInt.fromI32(0);
  globalState.totalCollectedOverstatedDueToForeclosures = BigInt.fromI32(0);
  globalState.totalTokenCostScaledNumeratorForeclosedTokens = BigInt.fromI32(0);
  globalState.totalTokenCostScaledNumeratorAccurate = BigInt.fromI32(0);
  globalState.erc721Address = erc721Address;
  globalState.stewardAddress = ZERO_ADDRESS;
  globalState.defaultAuctionStartPrice = BigInt.fromI32(0);
  globalState.defaultAuctionEndPrice = BigInt.fromI32(0);
  globalState.defaultAuctionLength = BigInt.fromI32(0);
  globalState.save();
  return globalState;
}
export function handleERC721Init(event: Init): void {
  let globalState = Global.load(GLOBAL_ID);

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (globalState == null) {
    globalState = createGlobalState(event.block.timestamp, event.address);
  }
}

export function handleMinterAdded(event: MinterAdded): void {
  let globalState = Global.load(GLOBAL_ID);

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (globalState == null) {
    globalState = createGlobalState(event.block.timestamp, event.address);
  }
}

export function handleMinterRemoved(event: MinterRemoved): void {}

export function handleTransfer(event: Transfer): void {}

export function handleApproval(event: Approval): void {}

export function handleApprovalForAll(event: ApprovalForAll): void {}
