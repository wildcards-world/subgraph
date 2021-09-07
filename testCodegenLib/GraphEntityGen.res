%%raw(`require('graphql-import-node/register')`)

@val external requireGqlFile: string => 'a = "require"

let result = requireGqlFile("../schema.graphql")

let repoConfigString = Node_fs.readFileAsUtf8Sync("./config.yaml")

let repoConfig = Utils.loadYaml(repoConfigString)

let entityDefinitions = result["definitions"]

let getDefaultValues = typeString =>
  switch typeString {
  | "Bytes" => `Bytes.fromHexString("0x00") as Bytes` // needs to be even length for some reason
  | "Address" => `Address.fromString("0x0000000000000000000000000000000000000000")`
  | "Int" => "0"
  | "String" => `""`
  | "BigInt" => "BigInt.fromI32(0)"
  | "Boolean" => "false"
  | unknownType => `"${unknownType} - Unknown type"`
  }
let toStringConverter = (paramName, paramType) =>
  switch paramType {
  | "Bytes" => `${paramName}.toHex()`
  | "Address" => `${paramName}.toHex()`
  | "BigInt" => `${paramName}.toString()`
  | "String" => paramName
  | unknownType => `"unhandled type in converter ${unknownType} - Please fix the converter"`
  }

type enumItem
let enumsMap: Js.Dict.t<enumItem> = Js.Dict.empty()
type interfaceItem
let interfacesMap: Js.Dict.t<interfaceItem> = Js.Dict.empty()
type entityItem
let entitiesMap: Js.Dict.t<entityItem> = Js.Dict.empty()

entityDefinitions->Array.forEach(entity => {
  let name = entity["name"]["value"]

  let entityKind = entity["kind"]

  let _ = switch entityKind {
  | #EnumTypeDefinition => enumsMap->Js.Dict.set(name, entity->Obj.magic)
  | #InterfaceTypeDefinition => interfacesMap->Js.Dict.set(name, entity->Obj.magic)
  | #ObjectTypeDefinition => entitiesMap->Js.Dict.set(name, entity->Obj.magic)
  }
})

let rec getFieldType = field =>
  switch field["kind"] {
  | #ListType => `array<${field["type"]->getFieldType}>`
  | #NonNullType => `${field["type"]->getFieldType} | null`
  | #NamedType => field["type"]["value"]
  | uncaught =>
    Js.log(uncaught)
    "unknown"
  }

let getDefaultValueForType = typeName => {
  entitiesMap
  ->Js.Dict.get(typeName)
  ->Option.mapWithDefault(
    enumsMap
    ->Js.Dict.get(typeName)
    ->Option.mapWithDefault(typeName->getDefaultValues, enum => {
      `"${((enum->Obj.magic)["values"]->Array.getUnsafe(0))["name"]["value"]}"`
    }),
    _entityType => `"UNITITIALIZED - ${typeName}"`,
  )
}
let rec getFieldDefaultTypeNonNull = field =>
  switch field["kind"] {
  | #ListType => "[]"
  | #NonNullType =>
    // This case sholud be impossible...
    field["type"]->getFieldDefaultTypeNonNull
  | #NamedType =>
    // Js.log(field)
    field["name"]["value"]->getDefaultValueForType
  | uncaught =>
    Js.log(uncaught)
    "unknown"
  }
let getFieldDefaultTypeWithNull = field =>
  switch field["kind"] {
  | #NonNullType => field["type"]->getFieldDefaultTypeNonNull
  | #ListType
  | #NamedType => "null"
  | uncaught =>
    Js.log(uncaught)
    "unknown"
  }
let functions =
  entitiesMap
  ->Js.Dict.keys
  ->Array.map(entityName => {
    let entity = entitiesMap->Js.Dict.unsafeGet(entityName)->Obj.magic
    let name = entity["name"]["value"]

    let fields = entity["fields"]

    let fieldDefaultSetters =
      fields
      ->Array.map(field => {
        let fieldName = field["name"]["value"]

        fieldName == "id"
          ? "\n" ++
            `    loaded${name} = new ${name}(entityId);` ++
            "\n" ++
            `    returnObject.entity = loaded${name} as ${name};`
          : `    loaded${name}.${fieldName} = ${field["type"]->getFieldDefaultTypeWithNull}`
      })
      ->Array.joinWith("\n", a => a)

    let idGeneratorFunction =
      repoConfig["entityIds"]
      ->Js.Dict.get(name)
      ->Option.map(idArgs => {
        let argsDefinition = idArgs->Array.joinWith(",", arg => `${arg["name"]}: ${arg["type"]}`)
        // no string interpolation in assemblyscript :(
        let idString =
          idArgs->Array.joinWith(` + "-" + `, arg => toStringConverter(arg["name"], arg["type"]))

        `export function generate${name}Id(
  ${argsDefinition}
): string {
  return ${idString}
}
`
      })
      ->Option.getWithDefault("")

    `
${idGeneratorFunction}
export function getOrInitialize${name}(entityId: string): GetOrCreateReturn<${name}> {
  let loaded${name} = ${name}.load(entityId);

  let returnObject = new GetOrCreateReturn<${name}>(loaded${name} as ${name}, false);

  if (loaded${name} == null) {${fieldDefaultSetters}
    loaded${name}.save();

    returnObject.wasCreated = true;
  }

  return returnObject;
}
export function get${name}(entityId: string): ${name} {
  let loaded${name} = ${name}.load(entityId);

  if (loaded${name} == null) {
    log.critical("Unable to find entity of type ${name} with id {}. If this entity hasn't been initialized use the 'getOrInitialize${name}' and handle the case that it needs to be initialized.", [entityId])
  }

  return loaded${name} as ${name};
}`
  })
  ->Array.joinWith("\n", a => a)

let entityImports =
  entityDefinitions
  ->Array.keep(entity => {
    entity["kind"] != #EnumTypeDefinition && entity["kind"] != #InterfaceTypeDefinition
  })
  ->Array.map(entity => `  ${entity["name"]["value"]}`)
  ->Array.joinWith(",\n", a => a)

let outputCode = `import {
${entityImports}
} from "../../generated/schema";
import {
  Address,
  BigInt,
  Bytes,
  ethereum,
  store,
  Value,
  log,
} from "@graphprotocol/graph-ts";

export class GetOrCreateReturn<EntityType> {
  entity: EntityType;
  wasCreated: boolean;

  constructor(entity: EntityType, wasCreated: boolean) {
    this.entity = entity;
    this.wasCreated = wasCreated;
  }
}
${functions}
`

Node_fs.writeFileAsUtf8Sync(`./src/generated/EntityHelpers.ts`, outputCode)
