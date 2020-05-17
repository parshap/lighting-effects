"use strict";

var through = require("through2");
var hsltorgb = require("hsl-to-rgb");

var LIGHT_SIZE = 0.03;

var CHRISTMAS_HUES_SETS = [
  [hsltorgb(0, 1, 0.5), hsltorgb(120, 1, 0.5)],
  [hsltorgb(356, 0.9, 0.5), hsltorgb(184, 0.6, 0.5), hsltorgb(69, 0.8, 0.5)],
];

function renderAlternatingColorPixels(strand, options) {
  var colors = options.colors;
  var lightSize = options.lightSize;
  for (var i = 0; i < strand.length; i++) {
    var lightIndex = Math.floor(i / lightSize);
    var color = colors[lightIndex % colors.length];
    strand.setPixel(i, color[0], color[1], color[2]);
  }
}

module.exports = function(strand) {
  var stream = through.obj();
  var lightSize = Math.round(LIGHT_SIZE * strand.length);
  function render() {
    renderAlternatingColorPixels(strand, {
      colors: CHRISTMAS_HUES_SETS[0],
      lightSize: lightSize,
    });
    stream.push(strand);
  }
  // Re-render hack to account for natural-dim only updating when effect
  // updates.
  render();
  setInterval(render, 1000 * 60 * 5);
  return stream;
};
