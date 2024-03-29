// Generated by ReScript, PLEASE EDIT WITH CARE
'use strict';

var Belt_Array = require("rescript/lib/js/belt_Array.js");

function covertToStateChange(eventName, paramsObject) {
  return /* Unclassified */{
          _0: {
            name: eventName,
            data: paramsObject
          }
        };
}

var emptyEventGroups = {
  allUnclassifiedEvents: []
};

function addEventToCorrectGrouping(currentEventGroups, param) {
  return {
          allUnclassifiedEvents: Belt_Array.concat(currentEventGroups.allUnclassifiedEvents, [param.data._0])
        };
}

exports.covertToStateChange = covertToStateChange;
exports.emptyEventGroups = emptyEventGroups;
exports.addEventToCorrectGrouping = addEventToCorrectGrouping;
/* No side effect */
