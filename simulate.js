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
var createEffect = getEffect(effectName);

// Start simulation
var stream = createOPCStream();
var strand = createStrand(STRAND_LENGTH);
var effect = createEffect(strand);
var simulator = createSimulator(stream);
effect.on("data", function(strand) {
  stream.writePixels(0, strand.buffer);
});
effect.on("error", function(err) {
  simulator.emit("error", err);
});
simulator.on("error", function(err) {
  console.error(err);
});
simulator.listen(process.env.PORT || 8080, function() {
  console.log("Listening %s", JSON.stringify(simulator.address()));
});
console.log("Starting simulation: %s", JSON.stringify(effectName));
