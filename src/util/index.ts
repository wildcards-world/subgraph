import { Steward } from "../../generated/Steward/Steward";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Patron } from "../../generated/schema";
import { log } from "@graphprotocol/graph-ts";
import { ZERO_ADDRESS } from "../CONSTANTS";

export function updateAvailableDepositAndForeclosureTime(
  steward: Steward,
  tokenPatron: Address,
  currentTimestamp: BigInt
): void {
  // if the token patron is the zero address, return! (for example it will be the zero address if the token is foreclosed and )
  if (tokenPatron.equals(ZERO_ADDRESS)) {
    return;
  }

  // if the steward 'owns' the token, it means that the token was foreclosed. No need to update anything.
  if (steward._address.equals(tokenPatron)) {
    return;
  }

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
  patron.save();
}
