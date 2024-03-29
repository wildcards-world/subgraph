// Generated by ReScript, PLEASE EDIT WITH CARE
'use strict';

var Fs = require("fs");
var JsYaml = require("js-yaml");
var Belt_Array = require("rescript/lib/js/belt_Array.js");

var subgraphConfigString = Fs.readFileSync("./subgraph.yaml", "utf8");

var finalConfig = JsYaml.load(subgraphConfigString);

var abisMapping = {};

Belt_Array.forEach(finalConfig.dataSources, (function (item) {
        var abis = item.mapping.abis;
        return Belt_Array.forEach(abis, (function (item) {
                      console.log(item);
                      var name = item.name;
                      var path = item.file;
                      abisMapping[name] = path;
                      
                    }));
      }));

var topLevelImports = "import {\n  Address,\n  BigInt,\n  Bytes,\n  ethereum,\n  store,\n  Value,\n} from \"@graphprotocol/graph-ts\";";

function getGraphTypeFromSolidityType(typeString) {
  if (typeString === "bool") {
    return "boolean";
  } else if (typeString === "bytes32") {
    return "Bytes";
  } else if (typeString === "uint16" || typeString === "uint32") {
    return "BigInt";
  } else if (typeString === "address[]") {
    return "array<Address>";
  } else if (typeString === "string") {
    return "string";
  } else if (typeString === "uint32[]") {
    return "array<BigInt>";
  } else if (typeString === "address") {
    return "Address";
  } else if (typeString === "int256" || typeString === "uint256" || typeString === "uint8") {
    return "BigInt";
  } else if (typeString === "bytes4") {
    return "Bytes";
  } else {
    console.log("Please handle all types - " + typeString + " isn't handled by this script.");
    return "unknownType";
  }
}

function ethereumValueConverterFromSolidityType(typeString) {
  return "ethereum.Value." + (
          typeString === "bool" ? "fromBoolean" : (
              typeString === "bytes32" ? "fromBytes" : (
                  typeString === "uint16" || typeString === "uint32" ? "fromSignedBigInt" : (
                      typeString === "address[]" ? "fromAddressArray" : (
                          typeString === "string" ? "fromString" : (
                              typeString === "uint32[]" ? "fromSignedBigIntArray" : (
                                  typeString === "address" ? "fromAddress" : (
                                      typeString === "int256" || typeString === "uint256" || typeString === "uint8" ? "fromSignedBigInt" : (
                                          typeString === "bytes4" ? "fromBytes" : (console.log("Please handle all types - " + typeString + " isn't handled by this script."), "unknownType")
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        );
}

Belt_Array.forEach(Object.keys(abisMapping), (function (key) {
        var abiFile = abisMapping[key];
        var abi = JSON.parse(Fs.readFileSync(abiFile, "utf8"));
        var events = Belt_Array.keep(abi, (function (item) {
                return item.type === "event";
              }));
        var match = Belt_Array.reduce(events, [
              "",
              ""
            ], (function (param, eventDef) {
                var eventName = eventDef.name;
                var eventParams = eventDef.inputs;
                var eventParamArgumentString = Belt_Array.joinWith(Belt_Array.map(eventParams, (function (eventParam) {
                            var eventParamName = eventParam.name;
                            var eventParamType = eventParam.type;
                            return eventParamName + ": " + getGraphTypeFromSolidityType(eventParamType);
                          })), ", ", (function (a) {
                        return a;
                      }));
                var eventParamAddersCode = Belt_Array.joinWith(Belt_Array.map(eventParams, (function (eventParam) {
                            var eventParamName = eventParam.name;
                            var eventParamType = eventParam.type;
                            return "\n  let " + eventParamName + "Param = new ethereum.EventParam();\n  " + eventParamName + "Param.name = \"" + eventParamName + "\";\n  " + eventParamName + "Param.value = " + ethereumValueConverterFromSolidityType(eventParamType) + "(" + eventParamName + ");\n  new" + eventName + "Event.parameters.push(" + eventParamName + "Param);";
                          })), "\n", (function (a) {
                        return a;
                      }));
                var createEventFunction = "\nexport function create" + eventName + "Event(" + eventParamArgumentString + "): " + eventName + " {\n  let new" + eventName + "Event = new " + eventName + "();\n\n  new" + eventName + "Event.parameters = new Array<ethereum.EventParam>();\n" + eventParamAddersCode + "\n\n  return new" + eventName + "Event;\n}";
                return [
                        "  " + param[0] + " \n  " + eventName + ",",
                        param[1] + "\n" + createEventFunction
                      ];
              }));
        var helperFileContents = topLevelImports + ("\nimport {" + match[0] + "\n} from \"../../../generated/" + key + "/" + key + "\";") + match[1];
        Fs.writeFileSync("./src/tests/generated/" + key + "Helpers.ts", helperFileContents, "utf8");
        
      }));

exports.subgraphConfigString = subgraphConfigString;
exports.finalConfig = finalConfig;
exports.abisMapping = abisMapping;
exports.topLevelImports = topLevelImports;
exports.getGraphTypeFromSolidityType = getGraphTypeFromSolidityType;
exports.ethereumValueConverterFromSolidityType = ethereumValueConverterFromSolidityType;
/* subgraphConfigString Not a pure module */
