"use strict";

var through = require("through2");
var hsltorgb = require("hsl-to-rgb");

var TAIL_SIZE = 1;
var PERIOD = 1400;
var TAIL_EXP = 2.2;
var TAIL_THRESHOLD = 1/4;
var HEAD_SIZE = 1/16;

function getTailLux(k) {
  // ((1 - k) * (1 + HEAD_SIZE))^TAIL_EXP
  k = 1 - k;
  k *= (1 + HEAD_SIZE);
  if (k <= TAIL_THRESHOLD) {
    return 0;
  }
  return Math.min(Math.pow(k, TAIL_EXP), 1);
}

function getPixelLux(time, lightPos, pixelPos) {
  var distance = lightPos - pixelPos;
  if (distance < 0 && time >= PERIOD) {
    distance = 1 - Math.abs(distance);
  }
  if (distance > 0 && distance <= TAIL_SIZE / 2) {
    return getTailLux(distance / (TAIL_SIZE / 2));
  }
  return 0;
}

function renderPixels(strand, time) {
  var lightPos = (time % PERIOD) / PERIOD;
  for (var i = 0; i < strand.length; i++) {
    var pixelPos = i / (strand.length - 1);
    var lux = 0;

    pixelPos = pixelPos / 2;
    lux = Math.max(getPixelLux(time, lightPos, pixelPos),
      getPixelLux(time, lightPos, 1 - pixelPos));

    var color = hsltorgb(0, 1, lux * 0.5);
    strand.setPixel(i, color[0], color[1], color[2]);
  }
}

module.exports = function(strand) {
  var stream = through.obj();
  stream.reset = function() {
    var start = Date.now();
    renderPixels(strand, 0);
    stream.push(strand.buffer);
    stream.push(strand.buffer);
    setInterval(function() {
      renderPixels(strand, Date.now() - start);
      stream.push(strand.buffer);
    }, (1 / (strand.length - 1)) * PERIOD);
  };
  stream.reset();
  return stream;
};
