"use strict";

var through = require("through2");
var colortemp = require("../lib/color-temperature");
var getSunLux = require("../lib/sun-lux");

var PERIOD = 1000 * 60; // 1 minute
var SF_LAT_LONG = [37.7833, -122.4167];
var NIGHT_TEMP = 2000;
var DAY_TEMP = 6000;

// Get a color given sun's illuminance score between [0, 1]
function getColor(lux) {
  var temp = lux * (DAY_TEMP - NIGHT_TEMP) + NIGHT_TEMP;
  return colortemp(temp);
}

function setAllPixels(strand, color) {
  color = color.map(dim).map(Math.round);
  for (var i = 0; i < strand.length; i++) {
    strand.setPixel(i, color[0], color[1], color[2]);
  }
}

function dim(val) {
  return 0.5 * val;
}

function renderPixels(strand, time) {
  var lux = getSunLux(new Date(time), SF_LAT_LONG[0], SF_LAT_LONG[1]);
  var color = getColor(lux);
  setAllPixels(strand, color);
}

module.exports = function(strand) {
  var stream = through.obj();

  // Set starting color, bypassing interpolation
  renderPixels(strand, Date.now());
  stream.push(strand.buffer);
  stream.push(strand.buffer);

  // Update color once every PERIOD
  setInterval(function() {
    renderPixels(strand, Date.now());
    stream.push(strand.buffer);
  }, PERIOD);

  return stream;
};
