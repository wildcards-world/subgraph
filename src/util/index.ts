import { Steward } from "../../generated/Steward/Steward";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Patron } from "../../generated/schema";
import { log } from "@graphprotocol/graph-ts";
import { ZERO_ADDRESS } from "../CONSTANTS";

export function initialiseDefaultPatronIfNull(
  steward: Steward,
  patronAddress: Address,
  currentTimestamp: BigInt
): void {
  let patronId = patronAddress.toHexString();
  let patron = new Patron(patronId);
  patron.address = patronAddress;
  patron.lastUpdated = currentTimestamp;
  patron.availableDeposit = steward.depositAbleToWithdraw(patronAddress);
  patron.patronTokenCostScaledNumerator = steward.totalPatronOwnedTokenCost(
    patronAddress
  );
  patron.foreclosureTime = steward.foreclosureTimePatron(patronAddress);
  patron.save();
}

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
    log.info('Created a new patron entity! patron address: "{}"', [
      tokenPatronStr
    ]);
    initialiseDefaultPatronIfNull(steward, tokenPatron, currentTimestamp);
    return;
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
