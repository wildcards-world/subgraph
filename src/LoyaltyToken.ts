import { log } from "@graphprotocol/graph-ts";
import { Transfer, LoyaltyToken } from "../generated/LoyaltyToken/LoyaltyToken";
import { getTokenBalance } from "./util/index";
import { PatronNew } from "../generated/schema";
import { createDefaultPatron } from "./rewrite/steward";
export function handleTransfer(event: Transfer): void {
  let from = event.params.from;
  let fromString = from.toHexString();
  let to = event.params.to;
  let toString = to.toHexString();
  let tokenAddress = event.address;
  let loyaltyToken = LoyaltyToken.bind(tokenAddress);
  let fromNewBalance = getTokenBalance(from, loyaltyToken);
  let toNewBalance = getTokenBalance(to, loyaltyToken);
  let patronFrom = PatronNew.load(fromString);
  let patronTo = PatronNew.load(toString);
  if (patronFrom == null) {
    patronFrom = createDefaultPatron(from, event.block.timestamp);
  }
  patronFrom.currentBalance = fromNewBalance;
  if (patronTo == null) {
    patronTo = createDefaultPatron(from, event.block.timestamp);
  }
  patronTo.currentBalance = toNewBalance;
  patronFrom.save();
  patronTo.save();
}
