"use strict";

var STRAND_START = 7 * 64;
var STRAND_LENGTH = 55;
var STRAND_END = STRAND_START + STRAND_LENGTH;

var Socket = require("net").Socket;
var createOPCStream = require("opc");
var createStrand = require("opc/strand");

var socket = new Socket();
socket.setNoDelay();
socket.connect(7890);
var stream = createOPCStream();
stream.pipe(socket);

var knightrider = require("./effects/knight-rider");
var strand = createStrand(STRAND_END);
knightrider(strand.slice(STRAND_START, STRAND_END))
  .on("data", function() {
    stream.writePixels(0, strand.buffer);
  });
