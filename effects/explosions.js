"use strict";

var through = require("through2");
var hsltorgb = require("hsl-to-rgb");
var clamp = require("clamp");

var UPDATE_INTERVAL = 40;
var NUM_EXPLOSIONS = 20;

function generateExplosion() {
  var hue = Math.random() > 0.5 ? 0 : 180;
  return {
    position: Math.random(),
    radius: Math.random() * 0.33,
    speed: 0.1 + Math.random() * 0.4,
    currentRadius: 0,
    color: hsltorgb(hue, 0.75 + Math.random() * 0.25, 0.25 + Math.random() * 0.5),
  };
}

function updateState(dt, state) {
  state.explosions.forEach(function(explosion) {
    explosion.currentRadius += explosion.radius * explosion.speed * dt;
  });
  state.explosions = state.explosions.filter(function(explosion) {
    return explosion.currentRadius < explosion.radius;
  });
  ensureMinimumExplosions(state.explosions);
}

function ensureMinimumExplosions(explosions) {
  var needed = Math.max(NUM_EXPLOSIONS - explosions.length, 0);
  for (var i = 0; i < needed; i++) {
    explosions.push(generateExplosion());
  }
}

function renderPixels(strand, state) {
  for (var i = 0; i < strand.length; i++) {
    strand.setPixel(i, 0, 0, 0);
  }

  state.explosions.forEach(function(explosion) {
    renderExplosion(strand, explosion);
  });
}

function renderExplosion(strand, explosion) {
  var strandFactor = strand.length - 1;
  var radius = explosion.currentRadius * strandFactor;
  var center = explosion.position * strandFactor;
  var start = clamp(center - radius, 0, strand.length - 1);
  var end = clamp(center + radius, 0, strand.length - 1);

  var startIndex = Math.round(start);
  var endIndex = Math.round(end);
  var color = explosion.color;
  for (var i = startIndex; i <= endIndex; i++) {
    strand.setPixel(i, color[0], color[1], color[2]);
  }
}

module.exports = function(strand) {
  var stream = through.obj();
  var intervalid;
  stream.reset = function() {
    var lastUpdate = Date.now();
    var state = {
      explosions: [],
    };

    renderPixels(strand, state);
    stream.push(strand);
    stream.push(strand);

    clearInterval(intervalid);
    intervalid = setInterval(function() {
      var now = Date.now();
      var dt = (now - lastUpdate) / 1000;
      lastUpdate = now;
      updateState(dt, state);
      renderPixels(strand, state);
      stream.push(strand);
    }, UPDATE_INTERVAL);
  };
  stream.reset();
  return stream;
};
