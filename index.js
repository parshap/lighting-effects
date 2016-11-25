"use strict";

require("bole").output({
  level: "debug",
  stream: process.stderr,
});

var STRAND_START = 7 * 64;
var STRAND_LENGTH = 55;
var STRAND_END = STRAND_START + STRAND_LENGTH;
var SF_LAT_LONG = [37.7833, -122.4167];

var Socket = require("net").Socket;
var createStrand = require("opc/strand");
var createNaturalDim = require("./lib/natural-dim");
var getEffect = require("./effects");
var createEffectManager = require("./manager");

// Get effect
var effectName = process.argv[2] || "natural";
var createEffect = getEffect(effectName);

// Create network socket
var socket = new Socket();
socket.setNoDelay();
socket.connect(7890);

// Create effect and write opc packets
var lights = createStrand(STRAND_END);
var strand = lights.slice(STRAND_START, STRAND_END);
var manager = createEffectManager(lights);
manager.setEffect([
  createEffect(strand)
    .pipe(createNaturalDim(SF_LAT_LONG[0], SF_LAT_LONG[1]))
]);
manager.on("error", function(err) {
  console.error(err);
});
manager.pipe(socket);
