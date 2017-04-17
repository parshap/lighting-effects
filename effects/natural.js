"use strict";

var through = require("through2");
var colortemp = require("../lib/color-temperature");
var getSunLux = require("../lib/sun-lux");

var PERIOD = 1000 * 60; // 1 minute
var NIGHT_TEMP = 2000;
var DAY_TEMP = 6000;

// Get a color given sun's illuminance score between [0, 1]
function getColor(lux) {
  var temp = lux * (DAY_TEMP - NIGHT_TEMP) + NIGHT_TEMP;
  return colortemp(temp);
}

function setAllPixels(strand, color) {
  for (var i = 0; i < strand.length; i++) {
    strand.setPixel(i, color[0], color[1], color[2]);
  }
}

function renderPixels(strand, time, opts) {
  var lux = getSunLux(new Date(time), opts.latlong[0], opts.latlong[1]);
  var color = getColor(lux);
  setAllPixels(strand, color);
}

module.exports = function(strand, opts) {
  var stream = through.obj();

  // Set starting color, bypassing interpolation
  renderPixels(strand, Date.now(), opts);
  stream.push(strand);

  // Update color once every PERIOD
  setInterval(function() {
    renderPixels(strand, Date.now(), opts);
    stream.push(strand);
  }, PERIOD);

  return stream;
};
