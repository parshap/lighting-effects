"use strict";

var SF_LAT_LONG = [37.7833, -122.4167];

var getSunLux = require("../lib/sun-lux");
var tape = require("tape");

function getSFLux(date) {
  return getSunLux(date, SF_LAT_LONG[0], SF_LAT_LONG[1]);
}

tape("getSunLux()", function(t) {
  t.equal(getSFLux(new Date(2016, 5, 14, 0)), 0);
  t.equal(getSFLux(new Date(2016, 5, 14, 12)), 1);
  var midLux = getSFLux(new Date(2016, 5, 14, 5));
  t.ok(midLux > 0 && midLux < 1);
  t.end();
});
