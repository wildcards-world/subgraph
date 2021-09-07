open GqlConverters
module ApolloQueryResult = ApolloClient.Types.ApolloQueryResult

// %graphql(`
//  fragment StakerStateInfo on StakeState{
//   id
//   blockNumber
//   creationTxHash
//   stateIndex
//   syntheticToken{
//     id
//   }
//   timestamp
//   accumulativeFloatPerToken
//   floatRatePerTokenOverInterval
//   timeSinceLastUpdate
//  }

//  fragment PriceInfo on Price{
//   id
//   price
//   timeUpdated
//   token{
//     id
//   }
//  }

//  fragment SyntheticTokenInfo on SyntheticToken{
//   id
//   tokenAddress
//   syntheticMarket{
//     id
//   }
//   tokenType
//   tokenSupply
//   floatMintedFromSpecificToken
//   latestStakerState{
//     id
//   }
//   latestPrice{
//     id
//     price{
//       id
//     }
//   }
//   priceHistory{
//     id
//   }
//  }

//  fragment SystemStateInfo on SystemState{
//    id
//    timestamp,
//    txHash,
//    blockNumber,
//    marketIndex,
//    syntheticPrice,
//    longTokenPrice{
//      id
//    }
//    shortTokenPrice{
//      id
//    }
//    longToken{
//      id
//    }
//    shortToken{
//      id
//    }
//    totalLockedLong,
//    totalLockedShort,
//    totalValueLocked,
//  }

//  fragment FeeStructureInfo on FeeStructure{
//    id
//    baseEntryFee
//    badLiquidityEntryFee
//    baseExitFee
//    badLiquidityExitFee
//  }

//   fragment CollateralTokenInfo on CollateralToken{
//   id
//   linkedMarkets{
//     id
//   }
//  }

//  fragment SyntheticMarketInfo on SyntheticMarket{
//   id
//   timestampCreated
//   txHash
//   blockNumberCreated
//   collateralToken {
//     id
//   }
//   name
//   symbol
//   marketIndex
//   oracleAddress
//   previousOracleAddresses
//   syntheticLong {
//     id
//   }
//   syntheticShort {
//     id
//   }
//   latestSystemState {
//     id
//   }
//   feeStructure {
//     id
//   }
//   kPeriod
//   kMultiplier
//  }
// `)

// TODO: make this still work when tests go further than 1000 items
module GetAllStateChanges = %graphql(`query {
  stateChanges (first:1000) {
    id
    txEventParamList {
      eventName
      params {
        param
        paramName
        paramType
      }
    }
    blockNumber
    timestamp
  }
}`)

let getAllStateChanges = () =>
  Client.instance.query(~query=module(GetAllStateChanges), ())->Js.Promise.then_(result => {
    switch result {
    | Ok({ApolloQueryResult.data: {GetAllStateChanges.stateChanges: stateChanges}}) =>
      Js.Promise.resolve(stateChanges)
    | Error(error) => Js.Promise.reject(error->Obj.magic)
    }
  }, _)
/*
//// From float capital as reference:
module GetGlobalState = %graphql(`query ($blockNumber: Int!) {
  globalState(id: "globalState", block: {number: $blockNumber}) {
    id
    contractVersion
    latestMarketIndex
    staker {
      id
      address
    }
    tokenFactory {
      id
      address
    }
    adminAddress
    longShort {
      id
      address
    }
    totalFloatMinted
    totalTxs    
    totalUsers
    timestampLaunched
    txHash
  }
}`)

let getGlobalStateAtBlock = (~blockNumber) =>
  Client.instance.query(
    ~query=module(GetGlobalState),
    {blockNumber: blockNumber},
  )->Js.Promise.then_(result => {
    switch result {
    | Ok({ApolloQueryResult.data: {GetGlobalState.globalState: Some(globalState)}}) =>
      Js.Promise.resolve(Some(globalState))
    | Ok({ApolloQueryResult.data: _}) => Js.Promise.resolve(None)
    | Error(error) => Js.Promise.reject(error->Obj.magic)
    }
  }, _)

module SyntheticMarket = %graphql(`query ($marketId: String!, $blockNumber: Int!) {
  syntheticMarket(id: $marketId, block: {number: $blockNumber}) {
    ...SyntheticMarketInfo
  }
}`)

module SyntheticToken = %graphql(`query ($tokenId: String!, $blockNumber: Int!) {
  syntheticToken(id: $tokenId, block: {number: $blockNumber}) {
    ...SyntheticTokenInfo
  }
}`)

let getSyntheticMarketAtBlock = (~marketId, ~blockNumber) =>
  Client.instance.query(
    ~query=module(SyntheticMarket),
    {blockNumber: blockNumber, marketId: marketId},
  )->Js.Promise.then_(result => {
    switch result {
    | Ok({ApolloQueryResult.data: {SyntheticMarket.syntheticMarket: Some(syntheticMarket)}}) =>
      Js.Promise.resolve(Some(syntheticMarket))
    | Ok({ApolloQueryResult.data: _}) => Js.Promise.resolve(None)
    | Error(error) => Js.Promise.reject(error->Obj.magic)
    }
  }, _)

let getSyntheticTokenAtBlock = (~tokenId, ~blockNumber) =>
  Client.instance.query(
    ~query=module(SyntheticToken),
    {blockNumber: blockNumber, tokenId: tokenId},
  )->Js.Promise.then_(result => {
    switch result {
    | Ok({ApolloQueryResult.data: {SyntheticToken.syntheticToken: Some(syntheticToken)}}) =>
      Js.Promise.resolve(Some(syntheticToken))
    | Ok({ApolloQueryResult.data: _}) => Js.Promise.resolve(None)
    | Error(error) => Js.Promise.reject(error->Obj.magic)
    }
  }, _)
 */
