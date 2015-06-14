"use strict";

var tape = require("tape");
var createNaturalDim = require("../lib/natural-dim");

var SF_LAT_LONG = [37.7833, -122.4167];

tape("natural dim at night", function(t) {
  var stream = createNaturalDim(SF_LAT_LONG[0], SF_LAT_LONG[1], {
    getDate: function() {
      return new Date(2015, 5, 14, 0);
    },
  });
  stream.on("error", function(err) {
    t.ifError(err);
  });
  stream.write(new Buffer([0, 20, 50, 7, 255, 255]));
  stream.on("data", function(data) {
    t.equal(data.get(0), 0);
    t.ok(data.get(1) < 20);
    t.ok(data.get(2) < 50);
    t.ok(data.get(3) < 7);
    t.ok(data.get(4) < 255);
    t.ok(data.get(5) < 255);
    stream.end();
  });
  stream.on("end", function() {
    t.end();
  });
});
