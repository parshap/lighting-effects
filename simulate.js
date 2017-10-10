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

const options = {
  latlong: [37.7833, -122,4167],
};

var strand = createStrand(STRAND_LENGTH);
var server = createSimulator(function() {
  var stream = createOPCStream();
  effect(strand, options).on("data", function(strand) {
    stream.writePixels(0, strand.buffer);
  });
  return stream;
});
server.listen(process.env.PORT || 8080, function() {
  console.log("Listening %s", JSON.stringify(server.address()));
});
console.log("\"%s\" simulation started", effectName);
