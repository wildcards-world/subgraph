// TODO: make this codegen write the output to a file rather then to terminal and piping it to the file.

let allStateChangesRaw = Queries.getAllStateChanges()
let filePreRamble = `// Generated by Codegen.res, PLEASE EDIT WITH CARE

open ConverterTypes`
let typesString = ref(``)
let converterStringHead = `let covertToStateChange = (eventName, paramsObject) => {
  // TODO: throw a (descriptive) error if the array of parameters are wrong somehow (or make a separate test?)
  switch eventName {`
let converterStringTail = `  | name => Unclassified({name: name, data: paramsObject})
  }
}`
let converterString = ref(converterStringHead)
let variantTypeString = ref(`type stateChanges =
  | Unclassified(unclassifiedEvent)`)
let eventGroupTypes = ref(`type eventGroup = {`)
let emptyEventGroupVar = ref(`let emptyEventGroups = {`)
let eventGroupSwitches = ref(``)

let lowercaseFirstLetter = %raw(`(word) => word.charAt(0).toLowerCase() + word.slice(1)`)

let paramTypeToRescriptType = paramType =>
  switch paramType {
  | "uint32"
  | "uint256" => "bn"
  | "string" => "string"
  | "address" => "address"
  | "address[]" => "array<Ethers.ethAddress>"
  | unknownType =>
    Js.log(`Please handle all types - ${unknownType} isn't handled by this script.`)
    "unknownType"
  }

let _ = allStateChangesRaw->JsPromise.map(allStateChanges => {
  let uniqueStateChangeTypes = Js.Dict.empty()
  allStateChanges->Array.forEach(({txEventParamList}) =>
    txEventParamList->Array.forEach(({eventName, params}) => {
      let eventGenerated = uniqueStateChangeTypes->Js.Dict.get(eventName)->Option.isNone

      if eventGenerated {
        uniqueStateChangeTypes->Js.Dict.set(eventName, "set")
        let recordFields = params->Array.reduce(``, (acc, {paramType, paramName}) =>
          acc ++
          `
  ${paramName}: ${paramType->paramTypeToRescriptType},`
        )

        let eventDataTypeName = `${eventName->lowercaseFirstLetter}Data`
        typesString :=
          typesString.contents ++
          `
@decco.decode
type ${eventDataTypeName} = {${recordFields}
}`
        let allEVentsVariable = `all${eventName}Events`

        eventGroupTypes :=
          eventGroupTypes.contents ++
          `
  ${allEVentsVariable}: array<eventData<${eventDataTypeName}>>,`

        emptyEventGroupVar :=
          emptyEventGroupVar.contents ++
          `
  ${allEVentsVariable}: [],`
        eventGroupSwitches :=
          eventGroupSwitches.contents ++
          `
  | ${eventName}(eventData) => {
      ...currentEventGroups,
      ${allEVentsVariable}: currentEventGroups.${allEVentsVariable}->Array.concat([
        {blockNumber: blockNumber, timestamp: timestamp, data: eventData, txHash: txHash},
      ]),
    }`

        converterString :=
          converterString.contents ++
          `
  | "${eventName}" => ${eventName}(paramsObject->Js.Json.object_->${eventDataTypeName}_decode->Result.getExn)`

        variantTypeString :=
          variantTypeString.contents ++
          `
  | ${eventName}(${eventDataTypeName})`
        ()
      }
    })
  )

  Js.log(
    `${filePreRamble}
${typesString.contents}

${variantTypeString.contents}

${converterString.contents}
${converterStringTail}

${eventGroupTypes.contents}
  allUnclassifiedEvents: array<ConverterTypes.unclassifiedEvent>,
}
${emptyEventGroupVar.contents}
  allUnclassifiedEvents: [],
}

let addEventToCorrectGrouping = (
  currentEventGroups,
  {ConverterTypes.blockNumber: blockNumber, timestamp, txHash, data},
) => {
  switch data {${eventGroupSwitches.contents}
  | Unclassified(event) => {
      ...currentEventGroups,
      allUnclassifiedEvents: currentEventGroups.allUnclassifiedEvents->Array.concat([event]),
    }
  }
}
`,
  )
  ()
})
