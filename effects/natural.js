"use strict";

var through = require("through2");
var suncalc = require("suncalc");
var colortemp = require("../color-temperature");

var PERIOD = 1000 * 60; // 1 minute
var SF_LAT_LONG = [37.7833, -122.4167];
var NIGHT_ALTITUDE = toRadians(-18);
var DAY_ALTITUDE = toRadians(6);
var NIGHT_TEMP = 2000;
var DAY_TEMP = 6000;

// Degrees to radians
function toRadians(deg) {
  return deg * (Math.PI / 180);
}

// Clamp a number between  lower and upper bounds (inclusive)
function clamp(val, low, hi) {
  val = Math.max(val, low);
  val = Math.min(val, hi);
  return val;
}

function getAltitude(time) {
  var date = new Date(time);
  var position = suncalc.getPosition(date, SF_LAT_LONG[0], SF_LAT_LONG[1]);
  return position.altitude;
}

// Get color given the sun's altitude above the horizon in radians
function getColor(altitude) {
  var z = (altitude - NIGHT_ALTITUDE) / (DAY_ALTITUDE - NIGHT_ALTITUDE);
  z = clamp(z, 0, 1);
  var temp = z * (DAY_TEMP - NIGHT_TEMP) + NIGHT_TEMP;
  return colortemp(temp);
}

function setAllPixels(strand, color) {
  color = color.map(dim);
  for (var i = 0; i < strand.length; i++) {
    strand.setPixel(i, color[0], color[1], color[2]);
  }
}

function dim(val) {
  return 0.5 * val;
}

function renderPixels(strand, time) {
  var altitude = getAltitude(time);
  var color = getColor(altitude);
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
