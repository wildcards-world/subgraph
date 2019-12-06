import { BigInt, Address, EthereumBlock } from "@graphprotocol/graph-ts"
import {
  Steward,
  LogBuy,
  LogPriceChange,
  LogForeclosure,
  LogCollection,
  LogRemainingDepositUpdate,
  AddToken
} from "../generated/Steward/Steward"
import { Wildcard, Patron, PreviousPatron, Price, TokenUri } from "../generated/schema"
import { Token } from "../generated/Token/Token"
import { create } from "domain"
// import { doTest } from "./testing"

// A token would need to be set to the same price
function getTokenIdFromTxTimestampAndTokenPrice(steward: Steward, txTimestamp: BigInt, tokenPrice: BigInt): i32 {
  // NOTE: not currently matching on price also - hacky code, but as long as it isn't a problem.
  if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(0)))) {
    return 0
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(1)))) {
    return 1
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(2)))) {
    return 2
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(3)))) {
    return 3
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(4)))) {
    return 4
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(5)))) {
    return 5
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(6)))) {
    return 6
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(7)))) {
    return 7
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(8)))) {
    return 8
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(9)))) {
    return 9
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(10)))) {
    return 10
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(11)))) {
    return 11
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(12)))) {
    return 12
  }
  else if (txTimestamp.equals(steward.timeAcquired(BigInt.fromI32(42)))) {
    return 42
  }
  else {
    return 55 // a random non-released token
  }
}

function createWildcardIfDoesntExist(steward: Steward, tokenId: BigInt): Wildcard {
  let wildcard = new Wildcard(tokenId.toString())

  let tokenAddress = steward.assetToken()
  let erc721 = Token.bind(tokenAddress)

  let tokenInfo = erc721.tokenURI(tokenId)

  // Entity fields can be set using simple assignments
  let tokenUri = new TokenUri(tokenId.toString())
  tokenUri.uriString = tokenInfo
  tokenUri.save()

  wildcard.tokenUri = tokenUri.id
  return wildcard
}

// TODO:: check on every block header if there are any foreclosures or do other updates to data. See how feasible this is.
export function handleLogBuy(event: LogBuy): void {
  let owner = event.params.owner
  let ownerString = owner.toHexString()

  // NOTE:: This is a bit hacky since LogBuy event doesn't include token ID.
  //        Get both patrons (since we don't know which one it is - didn't catch this at design time)
  let steward = Steward.bind(event.address)
  let tokenId = getTokenIdFromTxTimestampAndTokenPrice(steward, event.block.timestamp, event.params.price)
  if (tokenId == 42) return //Temporarily before token is migrated
  let tokenIdString = tokenId.toString()
  let tokenIdBigInt = BigInt.fromI32(tokenId)

  let wildcard = Wildcard.load(tokenIdString)

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(steward, tokenIdBigInt)
  }

  // Entity fields can be set using simple assignments
  wildcard.tokenId = BigInt.fromI32(tokenId)

  wildcard.priceHistory = wildcard.priceHistory.concat([wildcard.price])

  // let patron = Patron.load(ownerString)
  // if (patron == null) {
  //   patron = new Patron(ownerString)
  //   patron.address = owner
  //   patron.lastUpdated = event.block.number
  //   patron.save()
  // }
  let patron = Patron.load(ownerString)
  let patronOld = Patron.load(wildcard.owner)
  if (patron == null) {
    patron = new Patron(ownerString)
    patron.address = owner
    patron.lastUpdated = event.block.number
  }

  // Add to previouslyOwnedTokens if not already there
  patron.previouslyOwnedTokens = patron.previouslyOwnedTokens.indexOf(wildcard.id) === -1 ?
    patron.previouslyOwnedTokens.concat([wildcard.id]) : patron.previouslyOwnedTokens
  // Add token to the patrons currently held tokens
  patron.tokens = patron.tokens.concat([wildcard.id])
  let itemIndex = patronOld.tokens.indexOf(wildcard.id)
  // Remove token to the previous patron's tokens
  patronOld.tokens = patronOld.tokens.slice(0, itemIndex).concat(patronOld.tokens.slice(itemIndex + 1, patronOld.tokens.length))
  patron.save()
  patronOld.save()

  if (wildcard.owner !== "NO_OWNER") {
    let previousPatron = new PreviousPatron(ownerString)
    previousPatron.patron = patron.id;
    previousPatron.timeAcquired = wildcard.timeAcquired;
    previousPatron.timeSold = event.block.timestamp;
    previousPatron.save()

    wildcard.previousOwners = wildcard.previousOwners.concat([previousPatron.id])
  }

  let price = new Price(event.transaction.hash.toHexString())
  price.price = event.params.price
  price.timeSet = event.block.timestamp
  price.save()

  wildcard.price = price.id

  wildcard.owner = patron.id
  wildcard.timeAcquired = event.block.timestamp

  wildcard.save()
}

export function handleLogPriceChange(event: LogPriceChange): void {
  // NOTE:: This is a bit hacky since LogBuy event doesn't include token ID.
  //        Get both patrons (since we don't know which one it is - didn't catch this at design time)
  let steward = Steward.bind(event.address)
  let tokenId = getTokenIdFromTxTimestampAndTokenPrice(steward, event.block.timestamp, event.params.newPrice)
  let tokenIdString = tokenId.toString()
  let tokenIdBigInt = BigInt.fromI32(tokenId)

  let wildcard = Wildcard.load(tokenIdString)

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (wildcard == null) {
    wildcard = createWildcardIfDoesntExist(steward, tokenIdBigInt)
  }

  // Entity fields can be set using simple assignments
  wildcard.tokenId = tokenIdBigInt

  let price = new Price(event.transaction.hash.toHexString())
  price.price = event.params.newPrice
  price.timeSet = event.block.timestamp
  price.save()

  wildcard.price = price.id

  wildcard.save()
}

export function handleLogForeclosure(event: LogForeclosure): void {

}

export function handleLogCollection(event: LogCollection): void {

}

export function handleLogRemainingDepositUpdate(
  event: LogRemainingDepositUpdate
): void { }

export function handleAddToken(event: AddToken): void {
  let tokenId = event.params.tokenId
  let patronageNumerator = event.params.patronageNumerator

  let wildcard = new Wildcard(tokenId.toString())

  let steward = Steward.bind(event.address)

  let tokenAddress = steward.assetToken()
  let erc721 = Token.bind(tokenAddress)

  let tokenInfo = erc721.tokenURI(tokenId)

  // Entity fields can be set using simple assignments
  let tokenUri = new TokenUri(tokenId.toString())
  tokenUri.uriString = tokenInfo
  tokenUri.save()

  wildcard.tokenUri = tokenUri.id
  wildcard.tokenId = tokenId

  let price = new Price(event.transaction.hash.toHexString())
  price.price = BigInt.fromI32(0)
  price.timeSet = event.block.timestamp
  price.save()

  let patron = Patron.load("NO_OWNER")
  if (patron == null) {
    patron = new Patron("NO_OWNER")
    patron.address = Address.fromString("0x0000000000000000000000000000000000000000")
    patron.lastUpdated = event.block.number
    patron.save()
  }

  wildcard.price = price.id
  wildcard.owner = patron.id
  wildcard.patronageNumerator = patronageNumerator
  wildcard.timeAcquired = event.block.timestamp
  wildcard.previousOwners = []

  wildcard.save()
}
