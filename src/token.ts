import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  Token,
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
} from "./CONSTANTS";

export function handleMinterAdded(event: MinterAdded): void {
  let globalState = Global.load("1");

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (globalState == null) {
    globalState = new Global("1");
    globalState.version = BigInt.fromI32(0);
    globalState.timeLastCollected = event.block.timestamp;
    globalState.totalCollected = AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT;
    globalState.totalCollectedAccurate = globalState.totalCollected;
    // globalState.totalCollectedOrDue = globalState.totalCollected;
    globalState.totalCollectedOrDueAccurate = globalState.totalCollected;
    // globalState.totalTokenCostScaledNumerator = BigInt.fromI32(0);
    globalState.totalTokenCostScaledNumeratorAccurate = BigInt.fromI32(0);
    globalState.erc20Address = event.address;
    globalState.stewardAddress = ZERO_ADDRESS;
    globalState.defaultAuctionStartPrice = BigInt.fromI32(0);
    globalState.defaultAuctionEndPrice = BigInt.fromI32(0);
    globalState.defaultAuctionLength = BigInt.fromI32(0);
    globalState.save();
  }
}

export function handleMinterRemoved(event: MinterRemoved): void {}

export function handleTransfer(event: Transfer): void {}

export function handleApproval(event: Approval): void {}

export function handleApprovalForAll(event: ApprovalForAll): void {}
