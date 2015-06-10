"use strict";

var through = require("through2");
var suncalc = require("suncalc");
var colortemp = require("../color-temperature");

var PERIOD = 1000 * 60; // 1 minute
var SF_LAT_LONG = [37.7833, -122.4167];

function renderPixels(strand, date) {
  var times = suncalc.getTimes(date, SF_LAT_LONG[0], SF_LAT_LONG[1]);
  if (date < times.dawn || date > times.dusk) {
    setAllPixels(strand, colortemp(3000));
  }
  else {
    setAllPixels(strand, colortemp(6000));
  }
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

module.exports = function(strand) {
  var stream = through.obj();
  stream.reset = function() {
    renderPixels(strand, new Date());
    stream.push(strand.buffer);
    stream.push(strand.buffer);
    setInterval(function() {
      renderPixels(strand, new Date());
      stream.push(strand.buffer);
    }, PERIOD);
  };
  stream.reset();
  return stream;
};
