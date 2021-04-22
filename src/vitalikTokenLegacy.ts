import { BigInt, Address } from "@graphprotocol/graph-ts";
import {
  Transfer,
  Approval,
  ApprovalForAll,
} from "../generated/VitalikTokenLegacy/VitalikTokenLegacy";
import { Wildcard, Patron, Price, TokenUri, Global } from "../generated/schema";
import {
  ZERO_ADDRESS,
  VITALIK_PATRONAGE_NUMERATOR,
  ID_PREFIX,
  ZERO_BN,
} from "./CONSTANTS";
import { initialiseNoOwnerPatronIfNull } from "./util";

// NOTE: I commented out the below code since it is VEEERY slow (it has to scan each transaction for the `setup` function)
//       AND call handlers aren't supported by the graph on goerli testnet
// export function handleSetupVitalk(call: SetupCall): void {
//   // let vitalikToken = contract.bind(event.address)
// }
export function handleTransfer(event: Transfer): void {
  let wildcard = Wildcard.load(ID_PREFIX + "42");

  // This should only execute on the very first transfer (when the steward is deployed)
  if (wildcard == null) {
    let tokenId = BigInt.fromI32(42);
    let patronageNumerator = VITALIK_PATRONAGE_NUMERATOR;

    let wildcard = new Wildcard(ID_PREFIX + tokenId.toString());
    wildcard.launchTime = event.block.timestamp;

    // Entity fields can be set using simple assignments
    wildcard.tokenId = tokenId;

    let tokenUri = new TokenUri(tokenId.toString());
    tokenUri.uriString =
      '{"artist":"Matty Fraser","name":"Vitalik","ipfs":"QmXGMcZPxVVsbiHngN5hb79wyVEEx3CT4j8HUivvqpHMMV","type":"Gorilla"}';
    tokenUri.save();

    wildcard.tokenUri = tokenUri.id;

    let price = new Price(event.transaction.hash.toHexString());
    let initialPrice = ZERO_BN;
    price.price = initialPrice;
    price.timeSet = event.block.timestamp;
    price.save();

    let patron = Patron.load(ID_PREFIX + "NO_OWNER");
    if (patron == null) {
      patron = initialiseNoOwnerPatronIfNull();
    }

    wildcard.price = price.id;
    wildcard.currPrice = initialPrice;
    wildcard.owner = patron.id;
    wildcard.patronageNumerator = patronageNumerator;
    wildcard.timeAcquired = event.block.timestamp;
    wildcard.timeCollected = event.block.timestamp;
    wildcard.previousOwners = [];
    wildcard.totalCollected = BigInt.fromI32(0);
    wildcard.patronageNumeratorPriceScaled = BigInt.fromI32(0);

    wildcard.save();

    // // Decided not to deal with this global state for Vintage Vitalik.
    // let globalState = Global.load(GLOBAL_ID)

    // // // Entities only exist after they have been saved to the store;
    // // // `null` checks allow to create entities on demand
    // if (globalState == null) {
    //   globalState = new Global(GLOBAL_ID)
    //   globalState.totalCollected = BigInt.fromI32(0)
    //   globalState.totalCollected = BigInt.fromI32(0)
    //   globalState.save()
    // }
  }
}

export function handleApproval(event: Approval): void {}

export function handleApprovalForAll(event: ApprovalForAll): void {}
