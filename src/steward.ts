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
import { Wildcard, Patron, PreviousPatron } from "../generated/schema"
// import { doTest } from "./testing"

export function handleLogBuy(event: LogBuy): void {
  let price = event.params.price
  let owner = event.params.owner


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

  if (!Address.fromString("0x0000000000000000000000000000000000000000").equals(wildcard.owner)) {
    let patron = Patron.load(owner.toString())
    if (patron == null) {
      patron = new Patron(owner.toString())
      patron.address = owner
      patron.save()
    }

    let previousPatron = new PreviousPatron(owner.toString())
    previousPatron.patron = patron.id;
    previousPatron.timeAcquired = wildcard.timeAcquired;
    previousPatron.timeSold = event.block.timestamp;

    wildcard.previousOwners = wildcard.previousOwners.concat([wildcard.owner.toString()])
  }

  wildcard.price = price
  wildcard.owner = owner
  wildcard.timeAcquired = event.block.timestamp

  wildcard.save()
}

export function handleLogPriceChange(event: LogPriceChange): void {
  let price = event.params.newPrice

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
  wildcard.price = price

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
  wildcard.price = new BigInt(0)
  wildcard.owner = Address.fromString("0x0000000000000000000000000000000000000000")
  wildcard.patronageNumerator = patronageNumerator
  wildcard.timeAcquired = event.block.timestamp
  wildcard.previousOwners = []

  wildcard.save()
}
