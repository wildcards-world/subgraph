import { log } from "@graphprotocol/graph-ts";
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
} from "../generated/Steward/Steward";
import * as V0 from "./v0/steward";
import * as V1 from "./v1/steward";
import * as V2 from "./v2/steward";
import * as NEW from "./rewrite/steward";

// NOTE: Events labled with the latest version of the contracts (eg V1) will be the only events that will be called.
//       The rest of the events need to be there to make sure that the graph can do a full sync of the history.
//       Thus this is just an interface file with no logic in it.
export function handleLogBuy(event: LogBuy): void {
  V0.handleLogBuy(event);
  NEW.handleLogBuy(event);
}

export function handleLogPriceChange(event: LogPriceChange): void {
  V0.handleLogPriceChange(event);
}

export function handleLogForeclosure(event: LogForeclosure): void {
  V0.handleLogForeclosure(event);
}

export function handleLogCollection(event: LogCollection): void {
  V0.handleLogCollection(event);
}

export function handleLogRemainingDepositUpdate(
  event: LogRemainingDepositUpdate
): void {
  V0.handleLogRemainingDepositUpdate(event);
}

export function handleAddToken(event: AddToken): void {
  V1.handleAddToken(event);
}

export function handleBuy(event: Buy): void {
  V1.handleBuy(event);
  NEW.handleBuy(event);
}
export function handlePriceChange(event: PriceChange): void {
  V1.handlePriceChange(event);
}
export function handleForeclosure(event: Foreclosure): void {
  V1.handleForeclosure(event);
}
export function handleRemainingDepositUpdate(
  event: RemainingDepositUpdate
): void {
  V1.handleRemainingDepositUpdate(event);
}
export function handleCollectPatronage(event: CollectPatronage): void {
  V1.handleCollectPatronage(event);
  NEW.genericUpdateTimeHeld(
    event.params.patron,
    event.block.timestamp,
    Steward.bind(event.address),
    event.params.tokenId
  );
}
export function handleAddTokenV2(event: AddToken): void {
  V2.handleAddToken(event);
}

export function handleCollectLoyalty(event: CollectLoyalty): void {
  NEW.handleCollectLoyalty(event);
}
