import {
  AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT,
  NUM_SECONDS_IN_YEAR_BIG_INT,
} from "../CONSTANTS";
import { Steward } from "../../generated/Steward/Steward";
import { BigInt, log } from "@graphprotocol/graph-ts";
import { Global } from "../../generated/schema";

export function getTotalCollectedAccurate(
  steward: Steward,
  totalTokenCostScaledNumerator: BigInt,
  txTimestamp: BigInt
): BigInt {
  // load what version we are in (through global state)
  let globalState = Global.load("1");
  let currentVersion = globalState.version;

  // execure correct function based on on version.
  if (currentVersion.ge(BigInt.fromI32(3))) {
    return globalState.totalCollectedOrDueAccurate.plus(
      totalTokenCostScaledNumerator
        .times(txTimestamp.minus(globalState.timeLastCollected))
        .div(steward.patronageDenominator().times(NUM_SECONDS_IN_YEAR_BIG_INT))
    );
  } else {
    return AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT.plus(
      steward.totalCollected(BigInt.fromI32(0))
    )
      .plus(steward.totalCollected(BigInt.fromI32(1)))
      .plus(steward.totalCollected(BigInt.fromI32(2)))
      .plus(steward.totalCollected(BigInt.fromI32(3)))
      .plus(steward.totalCollected(BigInt.fromI32(4)))
      .plus(steward.totalCollected(BigInt.fromI32(5)))
      .plus(steward.totalCollected(BigInt.fromI32(6)))
      .plus(steward.totalCollected(BigInt.fromI32(7)))
      .plus(steward.totalCollected(BigInt.fromI32(8)))
      .plus(steward.totalCollected(BigInt.fromI32(9)))
      .plus(steward.totalCollected(BigInt.fromI32(10)))
      .plus(steward.totalCollected(BigInt.fromI32(11)))
      .plus(steward.totalCollected(BigInt.fromI32(12)))
      .plus(steward.totalCollected(BigInt.fromI32(13)))
      .plus(steward.totalCollected(BigInt.fromI32(14)))
      .plus(steward.totalCollected(BigInt.fromI32(15)))
      .plus(steward.totalCollected(BigInt.fromI32(16)))
      .plus(steward.totalCollected(BigInt.fromI32(17)))
      .plus(steward.totalCollected(BigInt.fromI32(18)))
      .plus(steward.totalCollected(BigInt.fromI32(19)))
      .plus(steward.totalCollected(BigInt.fromI32(20)))
      .plus(steward.totalCollected(BigInt.fromI32(21)))
      .plus(steward.totalCollected(BigInt.fromI32(22)))
      .plus(steward.totalCollected(BigInt.fromI32(23)))
      .plus(steward.totalCollected(BigInt.fromI32(24)))
      .plus(steward.totalCollected(BigInt.fromI32(25)))
      .plus(steward.totalCollected(BigInt.fromI32(42)));
  }
}
export function getTotalOwedAccurate(steward: Steward): BigInt {
  // load what version we are in (through global state)
  let globalState = Global.load("1");
  let currentVersion = globalState.version;

  // execure correct function based on on version.
  if (currentVersion.ge(BigInt.fromI32(3))) {
    return BigInt.fromI32(0);
  } else {
    return steward
      .patronageOwed(BigInt.fromI32(0))
      .plus(steward.patronageOwed(BigInt.fromI32(1)))
      .plus(steward.patronageOwed(BigInt.fromI32(2)))
      .plus(steward.patronageOwed(BigInt.fromI32(3)))
      .plus(steward.patronageOwed(BigInt.fromI32(4)))
      .plus(steward.patronageOwed(BigInt.fromI32(5)))
      .plus(steward.patronageOwed(BigInt.fromI32(6)))
      .plus(steward.patronageOwed(BigInt.fromI32(7)))
      .plus(steward.patronageOwed(BigInt.fromI32(8)))
      .plus(steward.patronageOwed(BigInt.fromI32(9)))
      .plus(steward.patronageOwed(BigInt.fromI32(10)))
      .plus(steward.patronageOwed(BigInt.fromI32(11)))
      .plus(steward.patronageOwed(BigInt.fromI32(12)))
      .plus(steward.patronageOwed(BigInt.fromI32(13)))
      .plus(steward.patronageOwed(BigInt.fromI32(14)))
      .plus(steward.patronageOwed(BigInt.fromI32(15)))
      .plus(steward.patronageOwed(BigInt.fromI32(16)))
      .plus(steward.patronageOwed(BigInt.fromI32(17)))
      .plus(steward.patronageOwed(BigInt.fromI32(18)))
      .plus(steward.patronageOwed(BigInt.fromI32(19)))
      .plus(steward.patronageOwed(BigInt.fromI32(20)))
      .plus(steward.patronageOwed(BigInt.fromI32(21)))
      .plus(steward.patronageOwed(BigInt.fromI32(22)))
      .plus(steward.patronageOwed(BigInt.fromI32(23)))
      .plus(steward.patronageOwed(BigInt.fromI32(24)))
      .plus(steward.patronageOwed(BigInt.fromI32(25)))
      .plus(steward.patronageOwed(BigInt.fromI32(42)));
  }
}
export function getTotalTokenCostScaledNumerator(steward: Steward): BigInt {
  return steward
    .patronageNumerator(BigInt.fromI32(0))
    .times(steward.price(BigInt.fromI32(0)))
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(1))
        .times(steward.price(BigInt.fromI32(1)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(2))
        .times(steward.price(BigInt.fromI32(2)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(3))
        .times(steward.price(BigInt.fromI32(3)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(4))
        .times(steward.price(BigInt.fromI32(4)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(5))
        .times(steward.price(BigInt.fromI32(5)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(6))
        .times(steward.price(BigInt.fromI32(6)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(7))
        .times(steward.price(BigInt.fromI32(7)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(8))
        .times(steward.price(BigInt.fromI32(8)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(9))
        .times(steward.price(BigInt.fromI32(9)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(10))
        .times(steward.price(BigInt.fromI32(10)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(11))
        .times(steward.price(BigInt.fromI32(11)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(12))
        .times(steward.price(BigInt.fromI32(12)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(13))
        .times(steward.price(BigInt.fromI32(13)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(14))
        .times(steward.price(BigInt.fromI32(14)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(15))
        .times(steward.price(BigInt.fromI32(15)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(16))
        .times(steward.price(BigInt.fromI32(16)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(17))
        .times(steward.price(BigInt.fromI32(17)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(18))
        .times(steward.price(BigInt.fromI32(18)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(19))
        .times(steward.price(BigInt.fromI32(19)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(20))
        .times(steward.price(BigInt.fromI32(20)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(21))
        .times(steward.price(BigInt.fromI32(21)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(22))
        .times(steward.price(BigInt.fromI32(22)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(23))
        .times(steward.price(BigInt.fromI32(23)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(24))
        .times(steward.price(BigInt.fromI32(24)))
    )
    .plus(
      steward
        .patronageNumerator(BigInt.fromI32(25))
        .times(steward.price(BigInt.fromI32(25)))
    )
    .plus(
      BigInt.fromI32(300)
        .times(BigInt.fromI32(1000000000))
        .times(steward.price(BigInt.fromI32(42)))
    );
}
