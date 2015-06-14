"use strict";

// A transform stream that will dim pixel colors based on the sun's luminance.
//
// The stream should be written strand pixel state buffer which will be mutated and re-emitted.

var getSunLux = require("./sun-lux");
var stream = require("readable-stream");
var createStrand = require("opc/strand");

var MAX_LIGHT = 0.4;
var MIN_LIGHT = 0.15;
var LIGHT_RANGE = MAX_LIGHT - MIN_LIGHT;

module.exports = function(lat, long, options) {
  options = options || {};
  var getDate = options.getDate || function() {
    return new Date();
  };
  return stream.Transform({
    transform: function(data, encoding, callback) {
      var strand = createStrand(data);
      var lux = getSunLux(getDate(), lat, long);
      var k = lux * LIGHT_RANGE + MIN_LIGHT;
      var mulK = function(val) {
        return val * k;
      };
      for (var i = 0; i < strand.length; i++) {
        var color = strand.getPixel(i).map(mulK).map(Math.floor);
        strand.setPixel(i, color[0], color[1], color[2]);
      }
      callback(null, strand.buffer);
    },
  });
};