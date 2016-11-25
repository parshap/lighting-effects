"use strict";

var createOPCStream = require("opc");

function addListeners(ee, listeners) {
  var added = [];
  Object.keys(listeners).forEach(function(key) {
    ee.on(key, listeners[key]);
    added.push([key, listeners[key]]);
  });
  return function removeListeners() {
    added.forEach(function(tuple) {
      ee.removeListener(tuple[0], tuple[1]);
    });
  };
}

module.exports = function createManager(lights) {
  var opcStream = createOPCStream();
  var shouldSkipNextInterpolation = true;
  var removeFns;

  function writePixels() {
    opcStream.writePixels(0, lights.buffer);
    if (shouldSkipNextInterpolation) {
      shouldSkipNextInterpolation = false;
      opcStream.writePixels(0, lights.buffer);
    }
  }

  return Object.assign(opcStream, {
    setEffect: function(effects) {
      shouldSkipNextInterpolation = true;
      if (removeFns) {
        removeFns.forEach(function(removeListeners) {
          removeListeners();
        });
      }
      removeFns = effects.map(function(effect) {
        return addListeners(effect, {
          data: function() {
            writePixels();
          },
          error: function(err) {
            opcStream.emit(err);
          }
        });
      });
    },
  });
};
