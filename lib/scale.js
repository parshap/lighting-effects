"use strict";

module.exports = function(k, opts) {
  var domain = opts.domain;
  var range = opts.range || domain;
  k = Math.max(k, domain[0]);
  k = Math.min(k, domain[1]);
  k = (k - domain[0]) / (domain[1] - domain[0]);
  k = k * (range[1] - range[0]) + range[0];
  return k;
};
