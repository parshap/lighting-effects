"use strict";

var STRAND_LENGTH = 55;

var createSimulator = require("opc-simulator");
var createOPCStream = require("opc");
var createStrand = require("opc/strand");

var effect = require("./effects/weather");

var strand = createStrand(STRAND_LENGTH);
createSimulator(function() {
  var stream = createOPCStream();
  effect(strand).on("data", function() {
    stream.writePixels(0, strand.buffer);
  });
  return stream;
}).listen(process.env.PORT || 8080);
