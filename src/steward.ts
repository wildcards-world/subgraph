import { BigInt, Address } from "@graphprotocol/graph-ts"
import {
  Steward,
  LogBuy,
  LogPriceChange,
  LogForeclosure,
  LogCollection,
  LogRemainingDepositUpdate,
  AddToken
} from "../generated/Steward/Steward"
import { Wildcard, Patron, PreviousPatron, Price } from "../generated/schema"
// import { doTest } from "./testing"

// TODO:: check on every block header if there are any foreclosures or do other updates to data. See how feasible this is.
export function handleLogBuy(event: LogBuy): void {
  let owner = event.params.owner
  let ownerString = owner.toHexString()

  // NOTE:: This is a bit hacky since LogBuy event doesn't include token ID.
  //        Get both patrons (since we don't know which one it is - didn't catch this at design time)
  let steward = Steward.bind(event.address)
  let timeAcquiredToken0 = steward.timeAcquired(BigInt.fromI32(0))
  let tokenId = (timeAcquiredToken0.equals(event.block.timestamp)) ? 0 : 1
  let tokenIdString = tokenId.toString()

  let wildcard = Wildcard.load(tokenIdString)

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (wildcard == null) {
    wildcard = new Wildcard(tokenIdString)
  }

  // Entity fields can be set using simple assignments
  wildcard.tokenId = BigInt.fromI32(tokenId)

  wildcard.priceHistory = wildcard.priceHistory.concat([wildcard.price])

  let patron = Patron.load(ownerString)
  if (patron == null) {
    patron = new Patron(ownerString)
    patron.address = owner
    patron.lastUpdated = event.block.number
    patron.save()
  }

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
  let timeAcquiredToken0 = steward.timeAcquired(BigInt.fromI32(0))
  let tokenId = (timeAcquiredToken0.equals(event.block.timestamp)) ? 0 : 1
  let tokenIdString = tokenId.toString()

  let wildcard = Wildcard.load(tokenIdString)

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  if (wildcard == null) {
    wildcard = new Wildcard(tokenIdString)
  }

  // Entity fields can be set using simple assignments
  wildcard.tokenId = BigInt.fromI32(tokenId)

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

  // Entity fields can be set using simple assignments
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
