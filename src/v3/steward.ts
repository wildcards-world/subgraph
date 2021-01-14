import {
  AddToken,
  Steward,
  UpgradeToV3,
  AddTokenV3,
  CollectLoyalty,
} from "../../generated/Steward/Steward";
import { Token } from "../../generated/Token/Token";
import { log, BigInt } from "@graphprotocol/graph-ts";
import {
  Wildcard,
  Global,
  Patron,
  Price,
  TokenUri,
} from "../../generated/schema";
import {
  getForeclosureTimeSafe,
  minBigInt,
  timeLastCollectedWildcardSafe,
  initialiseNoOwnerPatronIfNull,
  saveEventToStateChange,
} from "../util";
import { patronageTokenPerSecond, ID_PREFIX } from "../CONSTANTS";
import { GLOBAL_ID } from "../CONSTANTS";
import { createCounterIfDoesntExist } from "../v0/helpers";
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

  let globalState = Global.load(GLOBAL_ID);
  if (globalState == null) {
    log.critical("The global state is undefined!", []);
  }

  let steward = Steward.bind(event.address);
  let startPrice = steward.auctionStartPrice();
  let endPrice = steward.auctionEndPrice();
  let length = steward.auctionLength();

  globalState.version = BigInt.fromI32(3);
  globalState.defaultAuctionStartPrice = startPrice;
  globalState.defaultAuctionEndPrice = endPrice;
  globalState.defaultAuctionLength = length;

  globalState.save();
}

export function handleCollectLoyalty(event: CollectLoyalty): void {
  // Phase 1: reading and getting values.
  let collectedLoyaltyTokens = event.params.timeSinceLastMint;
  let patronAddress = event.params.patron;
  // let tokenId = event.params.tokenId;
  let patron = Patron.load(ID_PREFIX + patronAddress.toHexString());
  // let patronLegacy = Patron.load(ID_PREFIX + patronAddress.toHexString());
  // let numberOfTokensHeldByUserAtBeginningOfTx = BigInt.fromI32(
  //   // NOTE: the value on the `PatronNew` for tokens is currently inaccurate.
  //   patronLegacy.tokens.length
  // );
  let steward = Steward.bind(event.address);
  let ownedTokens = patron.tokens;
  // var stewardAddress = event.address;
  let foreclosureTime = getForeclosureTimeSafe(steward, patronAddress);
  if (foreclosureTime.equals(BigInt.fromI32(0))) {
    foreclosureTime = patron.foreclosureTime;
  }
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
    let tokenId = Wildcard.load(ID_PREFIX + currentTokenIdString).tokenId;
    // let localSteward = Steward.bind(stewardAddress);
    let timeTokenWasLastUpdated = timeLastCollectedWildcardSafe(
      steward,
      tokenId
    );
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

export function handleAddTokenV3(event: AddTokenV3): void {
  log.warning("ADDING A TOKEN!!!!!!!", []);
  log.warning("ADDING A TOKEN!!!!!!!", []);
  log.warning("ADDING A TOKEN!!!!!!!", []);
  log.warning("ADDING A TOKEN!!!!!!!", []);
  log.warning("ADDING A TOKEN!!!!!!!", []);
  log.warning("ADDING A TOKEN!!!!!!!", []);
  log.warning("Yayy", []);
  createCounterIfDoesntExist();

  let tokenId = event.params.tokenId;
  let txTimestamp = event.block.timestamp;
  let txHashString = event.transaction.hash.toHexString();
  let launchTime = event.params.unixTimestampOfTokenAuctionStart;

  let patronageNumerator = event.params.patronageNumerator;

  let wildcard = new Wildcard(ID_PREFIX + tokenId.toString());

  let steward = Steward.bind(event.address);

  // NOTE: this is only the case for a few tokens launched from goerli:
  if (launchTime.equals(BigInt.fromI32(0))) {
    // TAKE ZERO NOTICE OF THE BELOW CODE, only test purposes, not needed for mainnet.
    if (tokenId.equals(BigInt.fromI32(22))) {
      launchTime = BigInt.fromI32(1596541800);
    } else if (tokenId.equals(BigInt.fromI32(23))) {
      launchTime = BigInt.fromI32(1596551800);
    } else if (tokenId.equals(BigInt.fromI32(24))) {
      launchTime = BigInt.fromI32(1596591800);
    } else if (tokenId.equals(BigInt.fromI32(25))) {
      launchTime = BigInt.fromI32(1596690305);
    }
  }
  wildcard.launchTime = launchTime;

  let txHashStr = event.transaction.hash.toHexString();

  let tokenAddress = steward.assetToken();
  let erc721 = Token.bind(tokenAddress);

  let tokenInfo = erc721.tokenURI(tokenId);

  // Entity fields can be set using simple assignments
  let tokenUri = new TokenUri(tokenId.toString());

  tokenUri.uriString = tokenInfo;
  tokenUri.save();

  wildcard.tokenUri = tokenUri.id;
  wildcard.tokenId = tokenId;
  wildcard.totalCollected = BigInt.fromI32(0);
  wildcard.timeCollected = txTimestamp;

  let price = new Price(txHashStr);
  price.price = BigInt.fromI32(0);
  price.timeSet = txTimestamp;
  price.save();

  let patron = Patron.load(ID_PREFIX + "NO_OWNER");
  if (patron == null) {
    patron = initialiseNoOwnerPatronIfNull();
  }

  // wildcard.price = price.id.toString();
  // wildcard.owner = patron.id.toString();
  wildcard.owner = patron.id;
  wildcard.price = price.id;
  wildcard.patronageNumerator = patronageNumerator;
  wildcard.patronageNumeratorPriceScaled = BigInt.fromI32(0);
  wildcard.timeAcquired = txTimestamp;
  wildcard.previousOwners = [];

  // let newWildcard = handleAddTokenUtil(
  //   tokenId,
  //   txTimestamp,
  //   patronageNumerator,
  //   wildcard,
  //   steward,
  //   txHashStr
  // );

  wildcard.owner = "maticNO_OWNER";
  wildcard.save();
  // newWildcard.save();

  let eventParamValues: Array<string> = [
    tokenId.toString(),
    patronageNumerator.toString(),
    launchTime.toString(),
  ];
  let eventParamNames: Array<string> = [
    "tokenId",
    "patronageNumerator",
    "tokenGenerationRate",
  ];

  let eventParamTypes: Array<string> = ["uint256", "uint256", "uint256"];

  saveEventToStateChange(
    event.transaction.hash,
    txTimestamp,
    event.block.number,
    "handleAddToken",
    eventParamValues,
    eventParamNames,
    eventParamTypes,
    [],
    [wildcard.id],
    3
  );
}
