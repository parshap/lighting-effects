"use strict";

var through = require("through2");

module.exports = function(strand, color) {
  var stream = through.obj();
  for (var i = 0; i < strand.length; i++) {
    strand.setPixel(i, color[0], color[1], color[2]);
  }
  stream.push(strand);
  return stream;
};
