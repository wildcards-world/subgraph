open TestFramework

let emptyPromise = () =>
  Js.Promise.make((~resolve, ~reject as _) => resolve(. Converters.emptyEventGroups))

let allStateChanges: ref<JsPromise.t<Converters.eventGroup>> = ref(emptyPromise())

describe("All Tests", ({beforeAll, testAsync}) => {
  beforeAll(() => {
    let allStateChangesRaw = Queries.getAllStateChanges()

    allStateChanges :=
      allStateChangesRaw->StateChange.getAllStateChangeEvents->StateChange.splitIntoEventGroups
  })

  // describe("V1 event", ({testAsync}) => {
  //   testAsync("should occur exactly ONCE", ({expectEqual, callback}) => {
  //     let _ = allStateChanges.contents->JsPromise.map(({allV1Events}) => {
  //       expectEqual(allV1Events->Belt.Array.length, 1)
  //       callback()
  //     })
  //   })

  //   testAsync("should setup the correct initial data in the global state", ({
  //     expectEqual,
  //     expectNotEqual,
  //     expectTrue,
  //     callback,
  //   }) => {
  //     let _ = allStateChanges.contents->JsPromise.map(({allV1Events}) => {
  //       let {blockNumber, timestamp, data: {admin, staker, tokenFactory}} =
  //         allV1Events->Array.getExn(0)

  //       let _ = Queries.getGlobalStateAtBlock(~blockNumber)->JsPromise.map((
  //         result: option<Queries.GetGlobalState.t_globalState>,
  //       ) => {
  //         switch result {
  //         | Some({
  //             contractVersion,
  //             latestMarketIndex,
  //             staker: {address: addressStaker},
  //             tokenFactory: {address: addressTokenFactory},
  //             adminAddress,
  //             longShort: {id: _idLongShort}, // TODO: test that this is the same as the address that emitted this event
  //             totalFloatMinted,
  //             totalTxs,
  //             totalUsers,
  //             timestampLaunched,
  //             txHash,
  //           }) =>
  //           expectEqual(contractVersion->BN.toString, "1")
  //           expectEqual(latestMarketIndex->BN.toString, "0")
  //           expectEqual(totalFloatMinted->BN.toString, "0")
  //           expectEqual(totalTxs->BN.toString, "1") // Should the initializiation of the contract count as a transaction? Currently it is.
  //           expectEqual(totalUsers->BN.toString, "1") // THIS IS A BUG - should be zero to start
  //           expectEqual(timestampLaunched->BN.toString, timestamp->Int.toString)
  //           expectEqual(addressStaker, staker)
  //           expectEqual(addressTokenFactory, tokenFactory)
  //           expectEqual(adminAddress, admin)
  //           expectNotEqual(txHash, "")
  //         | None => expectTrue(false)
  //         }
  //         callback()
  //       })
  //     })
  //   })
  // })

  // describe("SyntheticMarketCreated event", ({testAsync}) => {
  //   testAsync("should occur more than ONCE (must test!)", ({expectTrue, callback}) => {
  //     let _ = allStateChanges.contents->JsPromise.map(({allSyntheticMarketCreatedEvents}) => {
  //       expectTrue(allSyntheticMarketCreatedEvents->Belt.Array.length >= 1)
  //       callback()
  //     })
  //   })

  //   testAsync("synthetic market shouldn't exist before this event is emitted", ({
  //     expectTrue,
  //     callback,
  //   }) => {
  //     let _ =
  //       allStateChanges.contents
  //       ->JsPromise.then(({allSyntheticMarketCreatedEvents}) => {
  //         allSyntheticMarketCreatedEvents
  //         ->Array.map(({blockNumber, data: {marketIndex}}) => {
  //           Queries.getSyntheticMarketAtBlock(
  //             ~blockNumber=blockNumber - 1,
  //             ~marketId=marketIndex->BN.toString,
  //           )->JsPromise.map(result => {
  //             switch result {
  //             | Some(_response) => expectTrue(false)
  //             | None => expectTrue(true)
  //             }
  //           })
  //         })
  //         ->JsPromise.all
  //       })
  //       ->JsPromise.map(_ => callback())
  //   })
  //   testAsync("should create a SyntheticMarket with correct ID and initial data", ({
  //     expectEqual,
  //     expectTrue,
  //     callback,
  //   }) => {
  //     let _ =
  //       allStateChanges.contents
  //       ->JsPromise.then(({allSyntheticMarketCreatedEvents}) => {
  //         allSyntheticMarketCreatedEvents
  //         ->Array.map(({
  //           blockNumber,
  //           timestamp,
  //           txHash,
  //           data: {
  //             marketIndex,
  //             longTokenAddress,
  //             shortTokenAddress,
  //             name,
  //             symbol,
  //             oracleAddress,
  //             collateralAddress,
  //           },
  //         }) => {
  //           Queries.getSyntheticMarketAtBlock(
  //             ~blockNumber,
  //             ~marketId=marketIndex->BN.toString,
  //           )->JsPromise.map(result => {
  //             switch result {
  //             | Some({
  //                 id,
  //                 timestampCreated,
  //                 txHash: resultTxHash,
  //                 blockNumberCreated,
  //                 collateralToken: {id: collateralTokenId},
  //                 name: resultName,
  //                 symbol: resultSymbol,
  //                 marketIndex,
  //                 oracleAddress: resultOracleAddress,
  //                 previousOracleAddresses,
  //                 syntheticLong: {id: longId},
  //                 syntheticShort: {id: shortId},
  //                 latestSystemState: {id: systemStateId},
  //                 feeStructure: {id: feeStructureId},
  //                 kPeriod,
  //                 kMultiplier,
  //               }) => {
  //                 expectEqual(id, marketIndex->BN.toString)
  //                 expectEqual(timestamp->Int.toString, timestampCreated->BN.toString)
  //                 expectEqual(txHash, resultTxHash)
  //                 expectEqual(blockNumber->Int.toString, blockNumberCreated->BN.toString)
  //                 expectEqual(name, resultName)
  //                 expectEqual(symbol, resultSymbol)
  //                 expectEqual(oracleAddress, resultOracleAddress)
  //                 expectEqual(kPeriod->BN.toString, "0") // BUG -> should be fixed in later versions of graph
  //                 expectEqual(kMultiplier->BN.toString, "0") // BUG -> should be fixed later versions
  //                 expectEqual(previousOracleAddresses, [])
  //                 expectEqual(longId, longTokenAddress)
  //                 expectEqual(shortId, shortTokenAddress)
  //                 expectEqual(systemStateId, marketIndex->BN.toString ++ "-0")
  //                 expectEqual(feeStructureId, marketIndex->BN.toString ++ "-fees")
  //                 expectEqual(collateralTokenId, collateralAddress)
  //               }

  //             | None => expectTrue(false)
  //             }
  //           })
  //         })
  //         ->JsPromise.all
  //       })
  //       ->JsPromise.map(_ => callback())
  //   })

  //   let testSyntheticToken = (
  //     ~syntheticTokenQuery: Queries.SyntheticTokenInfo.t,
  //     ~tokenAddress,
  //     ~timestamp,
  //     ~marketIndex,
  //     ~isLong,
  //     ~expectEqual: ('a, 'a) => unit,
  //   ) => {
  //     let {
  //       id,
  //       tokenAddress: graphTokenAddress,
  //       syntheticMarket: {id: marketId},
  //       tokenType,
  //       tokenSupply,
  //       floatMintedFromSpecificToken,
  //       latestStakerState: {id: stakerStateId},
  //       latestPrice: {id: latestPriceId, price: {id: priceId}},
  //       priceHistory,
  //     } = syntheticTokenQuery

  //     let tokenStrTypeUpper = isLong ? "Long" : "Short"
  //     let tokenStrTypeLower = isLong ? "long" : "short"

  //     expectEqual(tokenAddress, graphTokenAddress)
  //     expectEqual(marketId, marketIndex->BN.toString)
  //     expectEqual(tokenType->Obj.magic, tokenStrTypeUpper)
  //     expectEqual(floatMintedFromSpecificToken->BN.toString, "0")
  //     expectEqual(stakerStateId, tokenAddress ++ "-0")
  //     expectEqual(
  //       latestPriceId,
  //       "latestPrice-" ++ marketIndex->BN.toString ++ "-" ++ tokenStrTypeLower,
  //     )
  //     expectEqual(
  //       priceId,
  //       marketIndex->BN.toString ++ "-" ++ tokenStrTypeLower ++ "-" ++ timestamp->Int.toString,
  //     )
  //     let initialPriceId = (priceHistory->Array.getUnsafe(0)).id
  //     expectEqual(
  //       initialPriceId,
  //       marketIndex->BN.toString ++ "-" ++ tokenStrTypeLower ++ "-" ++ timestamp->Int.toString,
  //     )
  //     expectEqual(tokenSupply->BN.toString, "0")
  //     expectEqual(id, tokenAddress)
  //     expectEqual(priceHistory->Array.length->Int.toString, "1")
  //   }

  //   testAsync("should create SyntheticTokens with correct IDs and initial data", ({
  //     expectEqual,
  //     expectTrue,
  //     callback,
  //   }) => {
  //     let _ =
  //       allStateChanges.contents
  //       ->JsPromise.then(({allSyntheticMarketCreatedEvents}) => {
  //         allSyntheticMarketCreatedEvents
  //         ->Array.map(({
  //           blockNumber,
  //           timestamp,
  //           data: {marketIndex, longTokenAddress, shortTokenAddress},
  //         }) => {
  //           [
  //             Queries.getSyntheticTokenAtBlock(
  //               ~blockNumber,
  //               ~tokenId=longTokenAddress,
  //             )->JsPromise.map(result => {
  //               switch result {
  //               | Some(syntheticToken) =>
  //                 testSyntheticToken(
  //                   ~syntheticTokenQuery=syntheticToken,
  //                   ~tokenAddress=longTokenAddress,
  //                   ~marketIndex,
  //                   ~isLong=true,
  //                   ~timestamp,
  //                   ~expectEqual,
  //                 )
  //               | None => expectTrue(false)
  //               }
  //             }),
  //             Queries.getSyntheticTokenAtBlock(
  //               ~blockNumber,
  //               ~tokenId=shortTokenAddress,
  //             )->JsPromise.map(result => {
  //               switch result {
  //               | Some(syntheticToken) =>
  //                 testSyntheticToken(
  //                   ~syntheticTokenQuery=syntheticToken,
  //                   ~tokenAddress=shortTokenAddress,
  //                   ~marketIndex,
  //                   ~isLong=false,
  //                   ~timestamp,
  //                   ~expectEqual,
  //                 )
  //               | None => expectTrue(false)
  //               }
  //             }),
  //           ]->JsPromise.all
  //         })
  //         ->JsPromise.all
  //       })
  //       ->JsPromise.map(_ => callback())
  //   })
  // })

  // testAsync("All events should be classified - NO UNKNOWN EVENTS", ({callback, expectEqual}) => {
  //   let _ = allStateChanges.contents->JsPromise.map(({allUnclassifiedEvents}) => {
  //     expectEqual(allUnclassifiedEvents->Belt.Array.length, 0)
  //     callback()
  //   })
  // })
})
