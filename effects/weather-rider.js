"use strict";

var color = require("color-convert");
var createStrand = require("opc/strand");
var combineEffects = require("../lib/combine-effects");
var weather = require("./weather");
var rider = require("./knight-rider");

module.exports = function(strand) {
  return combineEffects(
    strand,
    [
      weather(createStrand(strand.length), {
        precipEffect: false,
      }),
      rider(createStrand(strand.length)),
    ],
    function(strand, strands) {
      for (var i = 0; i < strand.length; i++) {
        var weatherColor = color["rgb"]["hsl"](strands[0].getPixel(i));
        var riderColor = color["rgb"]["hsl"](strands[1].getPixel(i));
        var combinedColor = color["hsl"]["rgb"]([
          weatherColor[0],
          weatherColor[1],
          riderColor[2]]);
        strand.setPixel(i, combinedColor[0], combinedColor[1], combinedColor[2]);
      }
      return strand;
    }
  );
};
