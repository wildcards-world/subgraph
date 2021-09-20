// Generated by ReScript, PLEASE EDIT WITH CARE
'use strict';

var Curry = require("rescript/lib/js/curry.js");
var Queries = require("../Queries.bs.js");
var Converters = require("../stateChanges/Converters.bs.js");
var StateChange = require("../stateChanges/StateChange.bs.js");
var TestFramework = require("reason-test-framework/src/TestFramework.bs.js");

function emptyPromise(param) {
  return new Promise((function (resolve, param) {
                return resolve(Converters.emptyEventGroups);
              }));
}

var allStateChanges = {
  contents: new Promise((function (resolve, param) {
          return resolve(Converters.emptyEventGroups);
        }))
};

Curry._2(TestFramework.describe, "All Tests", (function (param) {
        Curry._1(param.beforeAll, (function (param) {
                var allStateChangesRaw = Queries.getAllStateChanges(undefined);
                allStateChanges.contents = StateChange.splitIntoEventGroups(StateChange.getAllStateChangeEvents(allStateChangesRaw));
                
              }));
        return Curry._2(param.testAsync, "I test nothing yet", (function (param) {
                      var callback = param.callback;
                      console.log("test just run");
                      allStateChanges.contents.then(function (allChanges) {
                            console.log(allChanges);
                            return Curry._1(callback, undefined);
                          });
                      
                    }));
      }));

exports.emptyPromise = emptyPromise;
exports.allStateChanges = allStateChanges;
/* allStateChanges Not a pure module */