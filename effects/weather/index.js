"use strict";

const color = require("color-convert");
const createStrand = require("opc/strand");
const combineEffects = require("../../lib/combine-effects");
const createHueEffect = require("./hue");
const createPrecipEffect = require("./precip");
const forecast = require("./forecast");
const log = require("bole")("effects/weather");
const fs = require("fs");

const WEATHER_UPDATE_INTERVAL = 1000 * 60 * 30; // 30 minutes

// ## Logging
//

function logWeather(weatherData) {
  log.info({
    hourly: weatherData.data.hourly.data.slice(0, 24).map(function(temp) {
      return {
        time: new Date(temp.time * 1000),
        apparentTemperature: temp.apparentTemperature,
        precipProbability: temp.precipProbability,
        precipIntensity: temp.precipIntensity,
      };
    }),
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

function forecastSample(callback) {
  if (USE_FIXTURES) {
    readSampleData(callback);
  }
  else {
    forecast(function(err, weatherData) {
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

// ## Effect
//

module.exports = function(inputStrand, options = {}) {
  // Default options
  // eslint-disable-next-line no-param-reassign
  options = Object.assign({
    precipEffect: true,
  }, options);

  function combineColors(i, strands) {
    const weatherColor = color.rgb.hsl(strands[0].getPixel(i));
    const precipColor = color.rgb.hsl(strands[1].getPixel(i));
    return color.hsl.rgb([
      weatherColor[0],
      weatherColor[1],
      precipColor[2],
    ]);
  }

  const effects = [
    createHueEffect(createStrand(inputStrand.length)),
    options.precipEffect &&
      createPrecipEffect(createStrand(inputStrand.length)),
  ].filter(Boolean);
  const combinedEffect = combineEffects(
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

  // Update weather forecast periodically
  (function updateWeather() {
    // Get weather data using Dark Sky API
    forecastSample(function(err, weatherData) {
      if (err) {
        combinedEffect.emit("error", err);
      }
      else {
        logWeather(weatherData);
        effects.forEach(function(effect) {
          effect.write(weatherData);
        });
      }
      setTimeout(updateWeather, WEATHER_UPDATE_INTERVAL);
    });
  }());

  return combinedEffect;
};
