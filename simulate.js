"use strict";

var STRAND_LENGTH = 55;

require("bole").output({
  level: "debug",
  stream: process.stderr,
});

var createSimulator = require("opc-simulator");
var createOPCStream = require("opc");
var createStrand = require("opc/strand");
var getEffect = require("./effects");

// Get effect
var effectName = process.argv[2] || "natural";
var effect = getEffect(effectName);

var strand = createStrand(STRAND_LENGTH);
createSimulator(function() {
  var stream = createOPCStream();
  effect(strand).on("data", function() {
    stream.writePixels(0, strand.buffer);
  });
  return stream;
}).listen(process.env.PORT || 8080);
