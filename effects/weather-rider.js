"use strict";

var createStrand = require("opc/strand");
var weather = require("./weather");
var rider = require("./knight-rider");
var color = require("color-convert");

module.exports = function(strand) {
  return combineEffects(
    strand,
    [
      weather(createStrand(strand.length)),
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

var through = require("through2");

var combineEffects = function(strand, streams, combineFn) {
  var retstream = through.obj();
  var strands = streams.map(function() {
    return null;
  });
  streams.forEach(function(stream, i) {
    stream.on("data", function(emittedStrand) {
      strands[i] = emittedStrand;
      if (strands.every(Boolean)) {
        strand = combineFn(strand, strands);
        retstream.push(strand);
      }
    });
    stream.on("error", retstream.emit.bind(retstream, "error"));
  });
  return retstream;
};
