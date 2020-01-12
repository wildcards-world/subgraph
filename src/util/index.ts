import { Steward } from "../../generated/Steward/Steward";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Patron } from "../../generated/schema";
import { log } from "@graphprotocol/graph-ts";

export function updateAvailableDepositAndForeclosureTime(
  steward: Steward,
  tokenPatron: Address,
  currentTimestamp: BigInt
): void {
  let tokenPatronStr = tokenPatron.toHexString();

  let patron = Patron.load(tokenPatronStr);

  if (patron == null) {
    log.critical(
      'a patron is null when remaining deposit is updated, there is a critical bug! patron address: "{}"',
      [tokenPatronStr]
    );
  }

  patron.availableDeposit = steward.depositAbleToWithdraw(tokenPatron);
  patron.foreclosureTime = steward.foreclosureTimePatron(tokenPatron);
  patron.lastUpdated = currentTimestamp;
}
