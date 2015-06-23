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
var createOPCStream = require("opc");
var createStrand = require("opc/strand");
var createNaturalDim = require("./lib/natural-dim");
var getEffect = require("./effects");

// Get effect
var effectName = process.argv[2] || "natural";
var effect = getEffect(effectName);

// Create network socket
var socket = new Socket();
socket.setNoDelay();
socket.connect(7890);
// Pipe opc packet stream to network socket
var stream = createOPCStream();
stream.pipe(socket);

// Create effect and write opc packets
var isFirstWrite = true;
var lights = createStrand(STRAND_END);
var strand = lights.slice(STRAND_START, STRAND_END);
effect(strand)
  .on("error", function(err) {
    console.error(err);
  })
  .pipe(createNaturalDim(SF_LAT_LONG[0], SF_LAT_LONG[1]))
  .on("data", function() {
    stream.writePixels(0, lights.buffer);
    if (isFirstWrite) {
      // Override Fadecandy interpolation
      isFirstWrite = false;
      stream.writePixels(0, lights.buffer);
    }
  });
