import { Address, BigInt, dataSource } from "@graphprotocol/graph-ts";

const maticTestingDeployment = true;

export let network = dataSource.network(); // e.g. "mainnet", "ropsten", "poa-core"

export let ZERO_ADDRESS = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);

export let ZERO_BN = BigInt.fromI32(0);

export const NUM_SECONDS_IN_YEAR = 31536000;
export let NUM_SECONDS_IN_YEAR_BIG_INT = BigInt.fromI32(NUM_SECONDS_IN_YEAR);
export let BILLION = BigInt.fromI32(1000000000);

// NOTE: using the bytes string wasn't working well, so this is how we convert 2697680747781582948 into a BigInt
// 2697680747781582948-243264269406392694(the refund given back to Simon due to mistake in smart contract)
//  = 2454416478375190254
//    2000000000 * 1000000000
//     454416478 * 1000000000
//              375190254
export let AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT: BigInt = BigInt.fromI32(
  2000000000
)
  .times(BILLION)
  .plus(BigInt.fromI32(454416478).times(BILLION))
  .plus(BigInt.fromI32(375190254));

// NOTE: BigInt.fromI32(300000000000) errors since '300000000000' is too big for i32
//       similarly for the patronage denominator.

// 20 ETH = 20000000000000000000 = 20 * billion * billion
export let VITALIK_PRICE_WHEN_OWNED_BY_SIMON = BigInt.fromI32(20)
  .times(BILLION)
  .times(BILLION);
export let VITALIK_PATRONAGE_NUMERATOR = BigInt.fromI32(300).times(BILLION);
export let GLOBAL_PATRONAGE_DENOMINATOR = BigInt.fromI32(1000).times(BILLION);
export let VITALIK_PATRONAGE_DENOMINATOR = GLOBAL_PATRONAGE_DENOMINATOR;
export const VITALIK_TOKEN_ID = "42";
export let patronageTokenPerSecond = BigInt.fromI32(11574)
  .times(BILLION)
  .plus(BigInt.fromI32(74074074));
//         11574074074074 (number of units of token created per second)
//     = ( 11574
//          *  1000000000 )
//          +    74074074

export const SIMON_DLR_ADDRESS = "0x0cacc6104d8cd9d7b2850b4f35c65c1ecdeece03";

export let VOTES_MANAGER_ENTITY_ID = "VOTE_MANAGER";
export let NO_OWNER = "NO_OWNER";

function getGlobalId(network: string): string {
  if (
    (network == "goerli" && maticTestingDeployment) ||
    network == "matic" ||
    network == "mumbai"
  ) {
    return "Matic-Global";
  } else {
    return "1";
  }
}
export let GLOBAL_ID = getGlobalId(network);

function getEventCounterId(network: string): string {
  if (
    (network == "goerli" && maticTestingDeployment) ||
    network == "matic" ||
    network == "mumbai"
  ) {
    return "Matic-Events";
  } else {
    return "1";
  }
}
export let EVENT_COUNTER_ID = getGlobalId(network);

function getIdPrefix(network: string): string {
  if (
    (network == "goerli" && maticTestingDeployment) ||
    network == "matic" ||
    network == "mumbai"
  ) {
    // if (
    //   network == "matic" || network == "mumbai") {
    return "matic";
  } else {
    return "";
  }
}
export let ID_PREFIX = getIdPrefix(network);
