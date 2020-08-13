import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  LogBuy,
  LogPriceChange,
  LogForeclosure,
  LogCollection,
  LogRemainingDepositUpdate,
  AddToken,
  Buy,
  PriceChange,
  Foreclosure,
  RemainingDepositUpdate,
  CollectPatronage,
  Steward,
  CollectLoyalty,
  ArtistCommission,
  AddTokenV3,
  UpgradeToV3,
} from "../generated/Steward/Steward";
import * as V0 from "./v0/steward";
import * as V1 from "./v1/steward";
import * as V2 from "./v2/steward";
import * as V3 from "./v3/steward";
import * as NEW from "./rewrite/steward";
import { Global } from "../generated/schema";

// NOTE: Events labled with the latest version of the contracts (eg V1) will be the only events that will be called.
//       The rest of the events need to be there to make sure that the graph can do a full sync of the history.
//       Thus this is just an interface file with no logic in it.
export function handleLogBuy(event: LogBuy): void {
  log.warning("handle log by! {}", [event.block.hash.toHexString()]);
  V0.handleLogBuy(event);
}

export function handleLogPriceChange(event: LogPriceChange): void {
  log.warning("handle log price change! {}", [event.block.hash.toHexString()]);
  V0.handleLogPriceChange(event);
}

export function handleLogForeclosure(event: LogForeclosure): void {
  log.warning("handle log foreclosure! {}", [event.block.hash.toHexString()]);
  V0.handleLogForeclosure(event);
}

export function handleLogCollection(event: LogCollection): void {
  log.warning("handle log collection! {}", [event.block.hash.toHexString()]);
  V0.handleLogCollection(event);
}

export function handleLogRemainingDepositUpdate(
  event: LogRemainingDepositUpdate
): void {
  log.warning("handle log remaining deposit! {}", [
    event.block.hash.toHexString(),
  ]);
  V0.handleLogRemainingDepositUpdate(event);
}

export function handleAddToken(event: AddToken): void {
  log.warning("handle add token (old)! {}", [event.block.hash.toHexString()]);
  V1.handleAddToken(event);
}

export function handleBuy(event: Buy): void {
  log.warning("handle buy! {}", [event.block.hash.toHexString()]);
  V1.handleBuy(event);
}
export function handlePriceChange(event: PriceChange): void {
  log.warning("handle price change! {}", [event.block.hash.toHexString()]);
  V1.handlePriceChange(event);
}
export function handleForeclosure(event: Foreclosure): void {
  log.warning("handle foreclosure! {}", [event.block.hash.toHexString()]);
  V1.handleForeclosure(event);
}
export function handleRemainingDepositUpdate(
  event: RemainingDepositUpdate
): void {
  log.warning("remaining deposit update! {}", [event.block.hash.toHexString()]);
  V1.handleRemainingDepositUpdate(event);
}

export function handleCollectPatronage(event: CollectPatronage): void {
  if (
    event.transaction.hash.toHexString() ==
    "0x870e216e388072cc375d6ebd90e503675b0d544f7662366352a236ac22527165"
  ) {
    let globalState = Global.load("1");
    if (globalState == null) {
      log.critical("The global state is undefined!", []);
    }

    globalState.version = BigInt.fromI32(3);

    globalState.save();
  }

  V1.handleCollectPatronage(event);

  NEW.genericUpdateTimeHeld(
    event.params.patron,
    event.block.timestamp,
    Steward.bind(event.address),
    event.params.tokenId
  );
}
export function handleAddTokenV2(event: AddToken): void {
  log.warning("Add new token! {}", [event.transaction.hash.toHexString()]);
  V2.handleAddToken(event);
}

export function handleCollectLoyalty(event: CollectLoyalty): void {
  log.warning("Collect loyalty! {}", [event.block.hash.toHexString()]);
  V3.handleCollectLoyalty(event);
}

export function handleAddTokenV3(event: AddTokenV3): void {
  V3.handleAddTokenV3(event);
}
export function handleCollectLoyaltyV3(event: CollectLoyalty): void {
  // TODO
}
export function handleArtistCommission(event: ArtistCommission): void {
  // TODO
}
export function handleUpgradeToV3(event: UpgradeToV3): void {
  V3.handleUpgradeToV3(event);
}
