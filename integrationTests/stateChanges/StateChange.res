open Converters

let getStateChange = (
  {eventName, params}: Queries.GetAllStateChanges.t_stateChanges_txEventParamList,
) => {
  let paramsObject = Js.Dict.empty()
  params->Array.forEach(({param, paramName}) =>
    paramsObject->Js.Dict.set(paramName, param->Js.Json.string)
  )
  covertToStateChange(eventName, paramsObject)
}

let getAllStateChangeEvents = allStateChangesRaw =>
  allStateChangesRaw->Js.Promise.then_(rawStateChanges => {
    rawStateChanges
    ->Array.reduce([], (
      currentArrayOfStateChanges,
      {Queries.GetAllStateChanges.id: id, txEventParamList, blockNumber, timestamp},
    ) =>
      currentArrayOfStateChanges->Array.concat(
        txEventParamList->Array.map(eventRaw => {
          ConverterTypes.blockNumber: blockNumber->BN.toNumber,
          timestamp: timestamp->BN.toNumber,
          txHash: id,
          data: eventRaw->getStateChange,
        }),
      )
    )
    ->Js.Promise.resolve
  }, _)

let splitIntoEventGroups = allStateChanges =>
  allStateChanges->Js.Promise.then_(
    stateChanges =>
      stateChanges->Array.reduce(emptyEventGroups, addEventToCorrectGrouping)->Js.Promise.resolve,
    _,
  )
