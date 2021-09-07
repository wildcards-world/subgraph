let subgraphConfigString = Node_fs.readFileAsUtf8Sync("./subgraph.yaml")

let finalConfig = Utils.loadYaml(subgraphConfigString)

let abisMapping = Js.Dict.empty()

finalConfig["dataSources"]->Array.forEach(item => {
  let abis = item["mapping"]["abis"]
  abis->Array.forEach(item => {
    Js.log(item)
    let name: string = item["name"]
    let path: string = item["file"]
    abisMapping->Js.Dict.set(name, path)
  })
})

let topLevelImports = `import {
  Address,
  BigInt,
  Bytes,
  ethereum,
  store,
  Value,
} from "@graphprotocol/graph-ts";`

let getGraphTypeFromSolidityType = typeString =>
  switch typeString {
  | #"uint32[]" => "array<BigInt>"
  | #uint8 => "BigInt"
  | #uint16 => "BigInt"
  | #uint32 => "BigInt"
  | #uint256 => "BigInt"
  | #int256 => "BigInt"
  | #string => "string"
  | #address => "Address"
  | #bytes4 => "Bytes"
  | #bytes32 => "Bytes"
  | #bool => "boolean"
  | #"address[]" => "array<Address>"
  | unknownType =>
    Js.log(`Please handle all types - ${unknownType->Obj.magic} isn't handled by this script.`)
    "unknownType"
  }

let ethereumValueConverterFromSolidityType = typeString =>
  `ethereum.Value.${switch typeString {
    | #"uint32[]" => "fromSignedBigIntArray"
    | #uint8 => "fromSignedBigInt"
    | #uint16 => "fromSignedBigInt"
    | #uint32 => "fromSignedBigInt"
    | #uint256 => "fromSignedBigInt"
    | #int256 => "fromSignedBigInt"
    | #string => "fromString"
    | #address => "fromAddress"
    | #bytes4 => "fromBytes"
    | #bytes32 => "fromBytes"
    | #bool => "fromBoolean"
    | #"address[]" => "fromAddressArray"
    | unknownType =>
      Js.log(`Please handle all types - ${unknownType->Obj.magic} isn't handled by this script.`)
      "unknownType"
    }}`

abisMapping
->Js.Dict.keys
->Array.forEach(key => {
  let abiFile = abisMapping->Js.Dict.unsafeGet(key)

  let abi = Node_fs.readFileAsUtf8Sync(abiFile)->Js.Json.parseExn->Obj.magic // use some useful polymorphic magic 🙌

  let events = abi->Array.keep(item => item["type"] == "event")

  let (eventImportsList, eventCreationFunctions) = events->Array.reduce(("", ""), (
    (eventImportsList, functions),
    eventDef,
  ) => {
    let eventName = eventDef["name"]
    let eventParams = eventDef["inputs"]

    let eventParamArgumentString =
      eventParams
      ->Array.map(eventParam => {
        let eventParamName = eventParam["name"]
        let eventParamType = eventParam["type"]

        `${eventParamName}: ${eventParamType->getGraphTypeFromSolidityType}`
      })
      ->Array.joinWith(", ", a => a)

    let eventParamAddersCode =
      eventParams
      ->Array.map(eventParam => {
        let eventParamName = eventParam["name"]
        let eventParamType = eventParam["type"]

        `
  let ${eventParamName}Param = new ethereum.EventParam();
  ${eventParamName}Param.name = "${eventParamName}";
  ${eventParamName}Param.value = ${eventParamType->ethereumValueConverterFromSolidityType}(${eventParamName});
  new${eventName}Event.parameters.push(${eventParamName}Param);`
      })
      ->Array.joinWith("\n", a => a)
    let createEventFunction = `
export function create${eventName}Event(${eventParamArgumentString}): ${eventName} {
  let new${eventName}Event = new ${eventName}();

  new${eventName}Event.parameters = new Array<ethereum.EventParam>();
${eventParamAddersCode}

  return new${eventName}Event;
}`

    (
      `  ${eventImportsList} 
  ${eventName},`,
      functions ++ "\n" ++ createEventFunction,
    )
  })

  let helperFileContents =
    topLevelImports ++
    `
import {${eventImportsList}
} from "../../../generated/${key}/${key}";` ++
    eventCreationFunctions

  Node_fs.writeFileAsUtf8Sync(`./src/tests/generated/${key}Helpers.ts`, helperFileContents)
})
