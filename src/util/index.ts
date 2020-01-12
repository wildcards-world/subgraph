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
  let tryForeclosureTime = steward.try_foreclosureTimePatron(tokenPatron); // this call can error if the combined price of the patrons token is zero (divide by zero error)!
  if (tryForeclosureTime.reverted) {
    patron.foreclosureTime = BigInt.fromI32(0);
  } else {
    patron.foreclosureTime = tryForeclosureTime.value;
  }
  patron.lastUpdated = currentTimestamp;
}
