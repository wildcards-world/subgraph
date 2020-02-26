import { Address, BigInt } from "@graphprotocol/graph-ts";

export const ZERO_ADDRESS = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);

export const NUM_SECONDS_IN_YEAR = 31536000;
export const NUM_SECONDS_IN_YEAR_BIG_INT = BigInt.fromI32(NUM_SECONDS_IN_YEAR);
// NOTE: using the bytes string wasn't working well, so this is how we convert 2697680747781582948 into a BigInt
// 2697680747781582948-243264269406392694(the refund given back to Simon due to mistake in smart contract) = 2454416478375190254
// 2000000000 * 1000000000
//  454416478 * 1000000000
//           375190254
export let BILLION = BigInt.fromI32(1000000000);
export const AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT: BigInt = BigInt.fromI32(
  2000000000
)
  .times(BILLION)
  .plus(BigInt.fromI32(454416478).times(BILLION))
  .plus(BigInt.fromI32(375190254));

// NOTE: BigInt.fromI32(300000000000) errors since '300000000000' is too big for i32
//       similarly for the patronage denominator.

// 20 ETH = 20000000000000000000 = 20 * billion * billion
export const VITALIK_PRICE_WHEN_OWNED_BY_SIMON = BigInt.fromI32(20)
  .times(BILLION)
  .times(BILLION);
export const VITALIK_PATRONAGE_NUMERATOR = BigInt.fromI32(300).times(BILLION);
export const GLOBAL_PATRONAGE_DENOMINATOR = BigInt.fromI32(1000).times(BILLION);
export const VITALIK_PATRONAGE_DENOMINATOR = GLOBAL_PATRONAGE_DENOMINATOR;
