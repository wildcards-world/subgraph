import { log } from "@graphprotocol/graph-ts";
import { Transfer, LoyaltyToken } from "../generated/LoyaltyToken/LoyaltyToken";
import { getTokenBalance } from "./util/index";
import { Patron } from "../generated/schema";
import { initialiseDefaultPatronIfNull } from "./util";
export function handleTransfer(event: Transfer): void {
  // // TODO: add this function back.
  // let from = event.params.from;
  // let fromString = from.toHexString();
  // let to = event.params.to;
  // let toString = to.toHexString();
  // let tokenAddress = event.address;
  // let loyaltyToken = LoyaltyToken.bind(tokenAddress);
  // let fromNewBalance = getTokenBalance(from, loyaltyToken);
  // let toNewBalance = getTokenBalance(to, loyaltyToken);
  // let patronFrom = Patron.load(ID_PREFIX + fromString);
  // let patronTo = Patron.load(ID_PREFIX + toString);
  // if (patronFrom == null) {
  //   patronFrom = initialiseDefaultPatronIfNull(steward, from, event.block.timestamp);
  // }
  // patronFrom.currentBalance = fromNewBalance;
  // if (patronTo == null) {
  //   patronTo = initialiseDefaultPatronIfNull(steward, to, event.block.timestamp);
  // }
  // patronTo.currentBalance = toNewBalance;
  // patronFrom.save();
  // patronTo.save();
}
