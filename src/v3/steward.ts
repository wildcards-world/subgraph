import {
  AddToken,
  Steward,
  UpgradeToV3,
  CollectLoyalty,
} from "../../generated/Steward/Steward";
import { log, BigInt } from "@graphprotocol/graph-ts";
import { Wildcard, Global, Patron } from "../../generated/schema";
import {
  handleAddTokenUtil,
  recognizeStateChange,
  getForeclosureTimeSafe,
  minBigInt,
} from "../util";
import { patronageTokenPerSecond } from "../CONSTANTS";
/*
// deprecated_totalCollected; // THIS VALUE IS DEPRECATED
    - 
// deprecated_currentCollected; // THIS VALUE IS DEPRECATED
// deprecated_timeLastCollected; // THIS VALUE IS DEPRECATED.
// deprecated_currentPatron; // Deprecate This is different to the current token owner.
// deprecated_patrons; // Deprecate
// deprecated_timeHeld; // Deprecate
// deprecated_timeAcquired; // deprecate
// deprecated_tokenGenerationRate; // we can reuse the patronage denominator
*/
export function handleUpgradeToV3(event: UpgradeToV3): void {
  log.warning("UpgradeToV3 was called!!! BLOCK - {}; HASH - {}.", [
    event.block.number.toString(),
    event.block.hash.toHexString(),
  ]);

  let globalState = Global.load("1");
  if (globalState == null) {
    log.critical("The global state is undefined!", []);
  }

  globalState.version = BigInt.fromI32(3);

  globalState.save();
}

export function handleCollectLoyalty(event: CollectLoyalty): void {
  // Phase 1: reading and getting values.
  let collectedLoyaltyTokens = event.params.timeSinceLastMint;
  let patronAddress = event.params.patron;
  // let tokenId = event.params.tokenId;
  let patron = Patron.load(patronAddress.toHexString());
  // let patronLegacy = Patron.load(patronAddress.toHexString());
  // let numberOfTokensHeldByUserAtBeginningOfTx = BigInt.fromI32(
  //   // NOTE: the value on the `PatronNew` for tokens is currently inaccurate.
  //   patronLegacy.tokens.length
  // );
  let steward = Steward.bind(event.address);
  let ownedTokens = patron.tokens;
  // var stewardAddress = event.address;
  let foreclosureTime = getForeclosureTimeSafe(steward, patronAddress);
  let txTimestamp = event.block.timestamp;
  // let timeSinceLastUpdatePatron = patron.lastUpdated;

  // Phase 2: calculate new values.
  let newTotalCollectedLoyaltyTokens = patron.totalLoyaltyTokens.plus(
    collectedLoyaltyTokens.times(patronageTokenPerSecond)
  );

  // let currentBalance = getTokenBalance(
  //   patronAddress,
  //   event.address
  // );

  // // TODO: Investigate why the bollow line works, but line 499 doesn't.
  // var settlementTime: BigInt = txTimestamp;
  var settlementTime: BigInt = minBigInt(foreclosureTime, txTimestamp);

  // let totalUnredeemed = BigInt.fromI32(0);
  let totalUnredeemed = BigInt.fromI32(0);
  for (let i = 0, len = ownedTokens.length; i < len; i++) {
    let currentTokenIdString: string = ownedTokens[i];
    // let currentTokenIdString: string = patronLegacy.tokens[i];
    let tokenId = Wildcard.load(currentTokenIdString).tokenId;
    // let localSteward = Steward.bind(stewardAddress);
    let timeTokenWasLastUpdated = steward.timeLastCollected(tokenId);
    let timeTokenHeldWithoutSettlement = settlementTime.minus(
      timeTokenWasLastUpdated
    );

    // var totalLoyaltyTokenDueByToken: BigInt = timeTokenHeldWithoutSettlement.times(
    //   patronageTokenPerSecond
    // );
    // return previous.plus(totalLoyaltyTokenDueByToken);
    // TODO: Investigate why the commented out code above doesn't work, but the bellow does.
    totalUnredeemed = totalUnredeemed.plus(
      timeTokenHeldWithoutSettlement.times(patronageTokenPerSecond)
    );
  }
  // // let totalUnredeemed = BigInt.fromI32(0);
  // let totalUnredeemed = ownedTokens.reduce<BigInt>(
  //   (previous: BigInt, currentTokenIdString: string): BigInt => {
  //     log.warning("11 -- {}", [currentTokenIdString]);
  //     // let currentTokenIdString: string = patronLegacy.tokens[i];
  //     let tokenId = WildcardNew.load(currentTokenIdString).tokenId;
  //     log.warning("12 -- {}", [currentTokenIdString]);
  //     let localSteward = Steward.bind(stewardAddress);
  //     log.warning("LOADED STEWARD -- {}", [currentTokenIdString]);
  //     let timeTokenWasLastUpdated = localSteward.timeLastCollected(tokenId);
  //     log.warning("13 -- {}", [currentTokenIdString]);
  //     let timeTokenHeldWithoutSettlement = settlementTime.minus(
  //       timeTokenWasLastUpdated
  //     );
  //     log.warning("14 -- {}", [currentTokenIdString]);
  //     log.warning("14 -- patron {}", [patronAddress.toHexString()]);

  //     // var totalLoyaltyTokenDueByToken: BigInt = timeTokenHeldWithoutSettlement.times(
  //     //   patronageTokenPerSecond
  //     // );
  //     // return previous.plus(totalLoyaltyTokenDueByToken);
  //     // TODO: Investigate why the commented out code above doesn't work, but the bellow does.
  //     return previous.plus(
  //       timeTokenHeldWithoutSettlement.times(patronageTokenPerSecond)
  //     );
  //   },
  //   BigInt.fromI32(0)
  // );
  let newTotalLoyaltyTokensIncludingUnRedeemed = newTotalCollectedLoyaltyTokens.plus(
    totalUnredeemed
  );

  // Alturnate Calculation (that returns a different answer XD)
  // let timeSinceLastPatronCollection = txTimestamp.minus(
  //   timeSinceLastUpdatePatron
  // );
  // let amountCollectedPerTokenSinceLastCollection = timeSinceLastPatronCollection.times(
  //   patronageTokenPerSecond
  // );
  // let newTokensDueSinceLastUpdate = numberOfTokensHeldByUserAtBeginningOfTx.times(
  //   amountCollectedPerTokenSinceLastCollection
  // );
  // let newTotalLoyaltyTokensIncludingUnRedeemed = patron.totalLoyaltyTokensIncludingUnRedeemed.plus(
  //   newTokensDueSinceLastUpdate
  // );

  // Phase 3: set+save values.
  patron.totalLoyaltyTokens = newTotalCollectedLoyaltyTokens;
  patron.totalLoyaltyTokensIncludingUnRedeemed = newTotalLoyaltyTokensIncludingUnRedeemed;

  patron.save();
}
