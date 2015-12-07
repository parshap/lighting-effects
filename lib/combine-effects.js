"use strict";

var through = require("through2");

module.exports = function combineEffects(strand, streams, combineFn) {
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
