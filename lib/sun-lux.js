"use strict";

// Get the sun's illuminance as a score between 0 (dark) and 1 (light)  by
// function of it's altitude in the sky at a given date and location.

var suncalc = require("suncalc");

// Degrees to radians
function toRadians(deg) {
  return deg * (Math.PI / 180);
}

function clamp(val, low, hi) {
  val = Math.max(val, low);
  val = Math.min(val, hi);
  return val;
}

var NIGHT_ALTITUDE = toRadians(-8);
var DAY_ALTITUDE = toRadians(8);

module.exports = function(date, lat, long) {
  var altitude = suncalc.getPosition(date, lat, long).altitude;
  var z = (altitude - NIGHT_ALTITUDE) / (DAY_ALTITUDE - NIGHT_ALTITUDE);
  z = clamp(z, 0, 1);
  return z;
};
