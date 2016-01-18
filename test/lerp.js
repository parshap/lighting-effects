"use strict";

var lerp = require("../lib/lerp");
var tape = require("tape");

tape("getSunLux()", function(t) {
  var values = [
    // at t=0, temperature was 70
    [0, 70],
    // at t=50, temperature was 70+10=80
    [0.5, 80],
    // at t=100, temperature was 70+30=100
    [1, 100],
  ];
  t.equal(lerp(values, -1), 70);
  t.equal(lerp(values, -0.1), 70);
  t.equal(lerp(values, 0), 70);
  t.equal(lerp(values, 0.25), 75);
  t.equal(lerp(values, 0.5), 80);
  t.equal(lerp(values, 0.75), 90);
  t.equal(lerp(values, 1), 100);
  t.equal(lerp(values, 1.5), 100);
  t.equal(lerp(values, 2), 100);
  t.end();
});

