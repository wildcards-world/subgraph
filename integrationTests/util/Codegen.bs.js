// Generated by ReScript, PLEASE EDIT WITH CARE
'use strict';

var Fs = require("fs");
var Js_dict = require("rescript/lib/js/js_dict.js");
var Queries = require("../Queries.bs.js");
var Belt_Array = require("rescript/lib/js/belt_Array.js");
var Belt_Option = require("rescript/lib/js/belt_Option.js");

var allStateChangesRaw = Queries.getAllStateChanges(undefined);

var filePreRamble = "// Generated by Codegen.res, PLEASE EDIT WITH CARE\n\nopen ConverterTypes";

var typesString = {
  contents: ""
};

var converterStringHead = "let covertToStateChange = (eventName, paramsObject) => {\n  // TODO: throw a (descriptive) error if the array of parameters are wrong somehow (or make a separate test?)\n  switch eventName {";

var converterStringTail = "  | name => Unclassified({name: name, data: paramsObject})\n  }\n}";

var converterString = {
  contents: converterStringHead
};

var variantTypeString = {
  contents: "type stateChanges =\n  | Unclassified(unclassifiedEvent)"
};

var eventGroupTypes = {
  contents: "type eventGroup = {"
};

var emptyEventGroupVar = {
  contents: "let emptyEventGroups = {"
};

var eventGroupSwitches = {
  contents: ""
};

var lowercaseFirstLetter = ((word) => word.charAt(0).toLowerCase() + word.slice(1));

function paramTypeToRescriptType(paramType) {
  switch (paramType) {
    case "address" :
        return "address";
    case "address[]" :
        return "array<Ethers.ethAddress>";
    case "string" :
        return "string";
    case "uint256" :
    case "uint32" :
        return "bn";
    default:
      console.log("Please handle all types - " + paramType + " isn't handled by this script.");
      return "unknownType";
  }
}

allStateChangesRaw.then(function (allStateChanges) {
      var uniqueStateChangeTypes = {};
      Belt_Array.forEach(allStateChanges, (function (param) {
              return Belt_Array.forEach(param.txEventParamList, (function (param) {
                            var eventName = param.eventName;
                            var eventGenerated = Belt_Option.isNone(Js_dict.get(uniqueStateChangeTypes, eventName));
                            if (!eventGenerated) {
                              return ;
                            }
                            uniqueStateChangeTypes[eventName] = "set";
                            var recordFields = Belt_Array.reduce(param.params, "", (function (acc, param) {
                                    return acc + ("\n  " + param.paramName + ": " + paramTypeToRescriptType(param.paramType) + ",");
                                  }));
                            var eventDataTypeName = lowercaseFirstLetter(eventName) + "Data";
                            typesString.contents = typesString.contents + ("\n@decco.decode\ntype " + eventDataTypeName + " = {" + recordFields + "\n}");
                            var allEVentsVariable = "all" + eventName + "Events";
                            eventGroupTypes.contents = eventGroupTypes.contents + ("\n  " + allEVentsVariable + ": array<eventData<" + eventDataTypeName + ">>,");
                            emptyEventGroupVar.contents = emptyEventGroupVar.contents + ("\n  " + allEVentsVariable + ": [],");
                            eventGroupSwitches.contents = eventGroupSwitches.contents + ("\n  | " + eventName + "(eventData) => {\n      ...currentEventGroups,\n      " + allEVentsVariable + ": currentEventGroups." + allEVentsVariable + "->Array.concat([\n        {blockNumber: blockNumber, timestamp: timestamp, data: eventData, txHash: txHash},\n      ]),\n    }");
                            converterString.contents = converterString.contents + ("\n  | \"" + eventName + "\" => " + eventName + "(paramsObject->Js.Json.object_->" + eventDataTypeName + "_decode->Result.getExn)");
                            variantTypeString.contents = variantTypeString.contents + ("\n  | " + eventName + "(" + eventDataTypeName + ")");
                            
                          }));
            }));
      
    });

Fs.writeFileSync("./integrationTests/stateChanges/Converters.res", filePreRamble + "\n" + typesString.contents + "\n\n" + variantTypeString.contents + "\n\n" + converterString.contents + "\n" + converterStringTail + "\n\n" + eventGroupTypes.contents + "\n  allUnclassifiedEvents: array<ConverterTypes.unclassifiedEvent>,\n}\n" + emptyEventGroupVar.contents + "\n  allUnclassifiedEvents: [],\n}\n\nlet addEventToCorrectGrouping = (\n  currentEventGroups,\n  {ConverterTypes.blockNumber: blockNumber, timestamp, txHash, data},\n) => {\n  switch data {" + eventGroupSwitches.contents + "\n  | Unclassified(event) => {\n      ...currentEventGroups,\n      allUnclassifiedEvents: currentEventGroups.allUnclassifiedEvents->Array.concat([event]),\n    }\n  }\n} \n", "utf8");

exports.allStateChangesRaw = allStateChangesRaw;
exports.filePreRamble = filePreRamble;
exports.typesString = typesString;
exports.converterStringHead = converterStringHead;
exports.converterStringTail = converterStringTail;
exports.converterString = converterString;
exports.variantTypeString = variantTypeString;
exports.eventGroupTypes = eventGroupTypes;
exports.emptyEventGroupVar = emptyEventGroupVar;
exports.eventGroupSwitches = eventGroupSwitches;
exports.lowercaseFirstLetter = lowercaseFirstLetter;
exports.paramTypeToRescriptType = paramTypeToRescriptType;
/* allStateChangesRaw Not a pure module */
