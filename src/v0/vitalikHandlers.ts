import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import { Steward } from "../../generated/Steward/Steward";
import { Patron } from "../../generated/schema";
import {
  VITALIK_PATRONAGE_DENOMINATOR,
  NUM_SECONDS_IN_YEAR_BIG_INT,
  VITALIK_PATRONAGE_NUMERATOR,
} from "../CONSTANTS";

export function isVintageVitalik(
  tokenId: BigInt,
  blockNumber: BigInt
): boolean {
  return (
    tokenId.equals(BigInt.fromI32(42)) &&
    blockNumber.lt(BigInt.fromI32(9077429))
  ); // block 9077422 is the block that Vitalik was mined at.
}

export function isVintageVitalikUpgradeTx(txHash: Bytes): boolean {
  return (
    txHash.toHexString() ==
    "0x819abe91008e8e22034b57efcff070c26690cbf55b7640bea6f93ffc26184d90"
  ); // 0x819abe91008e8e22034b57efcff070c26690cbf55b7640bea6f93ffc26184d90 is the transaction that vitalik was upgraded on.
}

export function handleVitalikUpgradeLogic(
  steward: Steward,
  tokenIdBigInt: BigInt,
  owner: Address,
  txTimestamp: BigInt
): void {
  let VITALIK_PRICE = steward.price(tokenIdBigInt);
  let vitaliksPatron = Patron.load(owner.toHexString());
  vitaliksPatron.availableDeposit = steward.depositAbleToWithdraw(owner);

  // This is for Vitalik+Simon, so token didn't foreclose, and he only holds 1 token.
  let timeSinceLastUpdate = txTimestamp.minus(vitaliksPatron.lastUpdated);
  vitaliksPatron.totalTimeHeld = vitaliksPatron.totalTimeHeld.plus(
    timeSinceLastUpdate
  );
  vitaliksPatron.totalContributed = vitaliksPatron.totalContributed.plus(
    vitaliksPatron.patronTokenCostScaledNumerator
      .times(timeSinceLastUpdate)
      .div(VITALIK_PATRONAGE_DENOMINATOR)
      .div(NUM_SECONDS_IN_YEAR_BIG_INT)
  );
  vitaliksPatron.patronTokenCostScaledNumerator = VITALIK_PRICE.times(
    VITALIK_PATRONAGE_NUMERATOR
  );

  let patronagePerSecond = VITALIK_PRICE.times(VITALIK_PATRONAGE_NUMERATOR)
    .div(VITALIK_PATRONAGE_DENOMINATOR)
    .div(NUM_SECONDS_IN_YEAR_BIG_INT);

  vitaliksPatron.foreclosureTime = txTimestamp.plus(
    vitaliksPatron.availableDeposit.div(patronagePerSecond)
  );
  vitaliksPatron.lastUpdated = txTimestamp;
  vitaliksPatron.save();
}
