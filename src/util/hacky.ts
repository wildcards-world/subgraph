import { AMOUNT_RAISED_BY_VITALIK_VINTAGE_CONTRACT } from "../CONSTANTS";
import { Steward } from "../../generated/Steward/Steward";
import { BigInt } from "@graphprotocol/graph-ts";

export function getTotalCollectedAccurate(steward: Steward): BigInt {
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
    .plus(steward.totalCollected(BigInt.fromI32(9)))
    .plus(steward.totalCollected(BigInt.fromI32(10)))
    .plus(steward.totalCollected(BigInt.fromI32(11)))
    .plus(steward.totalCollected(BigInt.fromI32(12)))
    .plus(steward.totalCollected(BigInt.fromI32(42)));
}
export function getTotalOwedAccurate(steward: Steward): BigInt {
  return steward
    .patronageOwed(BigInt.fromI32(0))
    .plus(steward.patronageOwed(BigInt.fromI32(1)))
    .plus(steward.patronageOwed(BigInt.fromI32(2)))
    .plus(steward.patronageOwed(BigInt.fromI32(3)))
    .plus(steward.patronageOwed(BigInt.fromI32(4)))
    .plus(steward.patronageOwed(BigInt.fromI32(5)))
    .plus(steward.patronageOwed(BigInt.fromI32(6)))
    .plus(steward.patronageOwed(BigInt.fromI32(7)))
    .plus(steward.patronageOwed(BigInt.fromI32(9)))
    .plus(steward.patronageOwed(BigInt.fromI32(10)))
    .plus(steward.patronageOwed(BigInt.fromI32(11)))
    .plus(steward.patronageOwed(BigInt.fromI32(12)))
    .plus(steward.patronageOwed(BigInt.fromI32(42)));
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
      BigInt.fromI32(300)
        .times(BigInt.fromI32(1000000000))
        .times(steward.price(BigInt.fromI32(42)))
    );
  // .plus(steward.patronageNumerator(BigInt.fromI32(42)).times(steward.price(BigInt.fromI32(42))))
}
