import { BigInt, Address } from "@graphprotocol/graph-ts"
import {
  VitalikStewardLegacy,
  LogBuy,
  LogPriceChange,
  LogForeclosure,
  LogCollection
} from "../generated/VitalikStewardLegacy"
import { Wildcard, Patron, PreviousPatron, Price } from "../generated/schema"

export function handleLogBuy(event: LogBuy): void {
  let owner = event.params.owner
  let ownerString = owner.toHexString()

  let tokenId = 42
  let tokenIdString = "42"

  let wildcard = Wildcard.load(tokenIdString)

  // Entity fields can be set using simple assignments
  wildcard.tokenId = BigInt.fromI32(tokenId)

  wildcard.priceHistory = wildcard.priceHistory.concat([wildcard.price])

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
  let tokenId = 42
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

export function handleLogForeclosure(event: LogForeclosure): void { }

export function handleLogCollection(event: LogCollection): void { }
