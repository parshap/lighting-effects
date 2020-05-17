"use strict";

const through = require("through2");
const once = require("once");
const hsltorgb = require("hsl-to-rgb");
const lerp = require("../../lib/lerp");
const normalizeWeatherData = require("./normalize-data");

const DOMAIN_PERIOD = 1000 * 60 * 60 * 24; // 24 hours
const RENDER_INTERVAL = 1000 * 60; // 1 minute

const HUE_INTERPOLATION = [
  {
    temp: 40,
    color: 240, // blue
  },
  {
    temp: 65,
    color: 120, // green
  },
  {
    temp: 90,
    color: 0, // red
  },
];

function getTemperatureHue(temp) {
  return lerp(HUE_INTERPOLATION, temp, {
    getX: def => def.temp,
    getY: def => def.color,
  });
}

function renderPixels(strand, weather, time) {
  const hourlyData = normalizeWeatherData(weather);
  for (let pixelIndex = 0; pixelIndex < strand.length; pixelIndex += 1) {
    const pixelTimeZ = pixelIndex / (strand.length - 1);
    const pixelTime = time + (pixelTimeZ * DOMAIN_PERIOD);
    const pixelApparentTemp = lerp(hourlyData, pixelTime, {
      getX: def => def.time,
      getY: def => def.apparentTemperature,
    });
    const color = hsltorgb(
      getTemperatureHue(pixelApparentTemp),
      1,
      0.5
    );
    strand.setPixel(pixelIndex, color[0], color[1], color[2]);
  }
}

module.exports = function createHueEffect(strand) {
  let weatherData = null;
  let startTime = null;
  const stream = through.obj(function(newWeatherData, enc, callback) {
    weatherData = newWeatherData;
    startTime = Date.now();
    // eslint-disable-next-line no-use-before-define
    start();
    callback();
  });

  function render() {
    const dt = Date.now() - startTime;
    renderPixels(
      strand,
      weatherData.data,
      weatherData.time + dt
    );
    stream.push(strand);
  }

  // Create a function to be called once a weather forecast is obtained to
  // begin rendering
  const start = once(function() {
    // Initial render
    render();
    // Update color once every RENDER_INTERVAL
    setInterval(() => render(), RENDER_INTERVAL);
  });

  return stream;
};
