"use strict";

var findFirstIndex = require("lodash/findIndex");
var findLastIndex = require("lodash/findLastIndex");

function interpolateValue(val1, val2, weight) {
  return val1 * (1 - weight) + val2 * weight;
}

// [0, 50, 100], 25
module.exports = function lerp(values, x, opts) {
  var getX = opts && opts.getX || function(value) {
    return value[0];
  };
  var getY = opts && opts.getY || function(value) {
    return value[1];
  };
  var x1Index = findLastIndex(values, function(value) {
    return getX(value) <= x;
  });
  var x2Index = findFirstIndex(values, function(value) {
    return getX(value) >= x;
  });
  if (x1Index === -1 && x2Index === -1) {
    return null;
  }
  else if (x1Index === -1 && x2Index !== -1) {
    return getY(values[x2Index]);
  }
  else if (x2Index === -1 && x1Index !== -1) {
    return getY(values[x1Index]);
  }
  else {
    var x1 = values[x1Index];
    var x2 = values [x2Index];
    var weight = (x - getX(x1)) / (getX(x2) - getX(x1));
    return interpolateValue(getY(x1), getY(x2), weight || 0);
  }
};
