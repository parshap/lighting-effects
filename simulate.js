"use strict";

var STRAND_LENGTH = 55;

var createSimulator = require("opc-simulator");
var createOPCStream = require("opc");
var createStrand = require("opc/strand");

var simulator = createSimulator(STRAND_LENGTH);
var stream = createOPCStream();
stream.pipe(simulator);

var knightrider = require("./effects/knight-rider");
var strand = createStrand(STRAND_LENGTH);
knightrider(strand).on("data", function() {
  stream.writePixels(0, strand.buffer);
});
