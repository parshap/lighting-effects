"use strict";

const color = require("color-convert");
const createStrand = require("opc/strand");
const combineEffects = require("../../lib/combine-effects");
const createHueEffect = require("./hue");
const createPrecipEffect = require("./precip");
const forecast = require("./forecast");
const log = require("bole")("effects/weather");
const fs = require("fs");
const normalizeWeatherData = require('./normalize-data');

const WEATHER_UPDATE_INTERVAL = 1000 * 60 * 30; // 30 minutes

// ## Logging
//

function logWeather(weatherData) {
  log.info({
    data: normalizeWeatherData(weatherData.data),
  }, "weather");
}

// ## Sample data
//

const USE_FIXTURES = process.env.USE_FIXTURES;
const WRITE_FIXTURES = process.env.WRITE_FIXTURES;
const WEATHER_FIXTURE_PATH = `${__dirname}/../../fixtures/weather.json`;

function readSampleData(callback) {
  fs.readFile(WEATHER_FIXTURE_PATH, function(err, buffer) {
    if (err) {
      callback(err);
    }
    else {
      try {
        const data = JSON.parse(buffer.toString());
        process.nextTick(() => callback(null, data));
      }
      catch (parseErr) {
        callback(parseErr);
      }
    }
  });
}

function writeSampleData(data, callback) {
  let buffer;
  try {
    buffer = Buffer.from(JSON.stringify(data, null, 2));
  }
  catch (err) {
    process.nextTick(() => callback(err));
    return;
  }
  fs.writeFile(WEATHER_FIXTURE_PATH, buffer, callback);
}

function maybeWriteSampleData(data, callback) {
  if (WRITE_FIXTURES) {
    writeSampleData(data, function(err) {
      if (err) {
        callback(err);
      }
      callback(null, data);
    });
  }
  else {
    process.nextTick(callback);
  }
}

function forecastSample(opts, callback) {
  if (USE_FIXTURES) {
    readSampleData(callback);
  }
  else {
    forecast(opts, function(err, weatherData) {
      if (err) {
        callback(err);
      }
      else {
        const data = {
          time: Date.now(),
          data: weatherData,
        };
        maybeWriteSampleData(data, function(writeErr) {
          if (writeErr) {
            callback(writeErr);
          }
          else {
            callback(null, data);
          }
        });
      }
    });
  }
}

// ## Precip + Hue Forecast
//

function combineColors(i, strands) {
  const weatherColor = color.rgb.hsl(strands[0].getPixel(i));
  const precipColor = color.rgb.hsl(strands[1].getPixel(i));
  return color.hsl.rgb([
    weatherColor[0],
    weatherColor[1],
    precipColor[2],
  ]);
}

function createPrecipHueEffect(inputStrand, options) {
  const effects = [
    createHueEffect(createStrand(inputStrand.length), options),
    options.precipEffect &&
      createPrecipEffect(createStrand(inputStrand.length), options),
  ].filter(Boolean);
  return combineEffects(
    inputStrand,
    effects,
    function(strand, strands) {
      for (let i = 0; i < strand.length; i += 1) {
        if (options.precipEffect) {
          const combinedColor = combineColors(i, strands);
          strand.setPixel(
            i,
            combinedColor[0],
            combinedColor[1],
            combinedColor[2]
          );
        }
        else {
          const hueColor = strands[0].getPixel(i);
          strand.setPixel(
            i,
            hueColor[0],
            hueColor[1],
            hueColor[2]
          );
        }
      }
      return strand;
    }
  );
}

// ## Effect
//

module.exports = function(inputStrand, options) {
  // Default options
  // eslint-disable-next-line no-param-reassign
  console.log("effect options", options);
  options = Object.assign({
    precipEffect: true,
  }, options);
  const effect = createPrecipHueEffect(inputStrand, options);

  // Update weather forecast periodically
  (function updateWeather() {
    // Get weather data using Dark Sky API
    const forecastOpts = {
      latlong: options.latlong,
    };
    forecastSample(forecastOpts, function(err, weatherData) {
      if (err) {
        effect.emit("error", err);
      }
      else {
        logWeather(weatherData);
        effect.write(weatherData);
      }
      setTimeout(updateWeather, WEATHER_UPDATE_INTERVAL);
    });
  }());

  return effect;
};
