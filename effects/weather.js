"use strict";

var FORECASTIO_KEY = process.env.FORECASTIO_KEY;
var TEST_TEMP_COLORS = !! process.env.TEST_TEMP_COLORS;
var SF_LAT_LONG = [37.7833, -122.4167];
var RENDER_INTERVAL = 1000 * 60; // 1 minute
var WEATHER_UPDATE_INTERVAL = 1000 * 60 * 30; // 30 minutes
var DOMAIN_PERIOD = 1000 * 60 * 60 * 12; // 12 hours
// Temperatures
var COLD_DEG = 40;
var HOT_DEG = 90;
var NORMAL_DEG = 65;
// Colors
var HOT_HUE = 0;
var NORMAL_HUE = 120;
var COLD_HUE = 240;

var findFirstIndex = require("lodash/findIndex");
var findLastIndex = require("lodash/findLastIndex");
var through = require("through2");
var once = require("once");
var ForecastIO = require("forecast.io");
var hsltorgb = require("hsl-to-rgb");
var createStrand = require("opc/strand");
var lerp = require("../lib/lerp");
var combineEffects = require("../lib/combine-effects");
var scale = require("../lib/scale");

var _log = require("bole")("effects/weather");
var log = _log;


// ## Forecast.io API
//

var forecast = new ForecastIO({
  APIKey: FORECASTIO_KEY,
  timeout: 10000,
});

function logWeather(weatherData) {
  log.info({
    hourly: weatherData.hourly.data.slice(0, 24).map(function(temp) {
      return {
        time: new Date(temp.time * 1000),
        apparentTemperature: temp.apparentTemperature,
      };
    }),
  }, "weather");
}

function forecastWeather(callback) {
  process.nextTick(function() {
    callback(null, require("../sample-weather.json"));
  });
  return;
  var log = _log("forecast.io");
  var start = Date.now();
  var options = {
    exclude: "currently,minutely,daily,alerts",
  };
  log.debug("request");
  forecast.get(SF_LAT_LONG[0], SF_LAT_LONG[1], options, function(err, resp, data) {
    log.info({
      err: err,
      elapsed: Date.now() - start,
    }, "response");
    if (err) {
      return callback(err);
    }
    else {
      require("fs").writeFileSync("sample-weather.json", JSON.stringify(data));
      callback(null, data);
    }
  });
}

// ## Precipitation
//
// Precipitation is shown with pixels animated to fade in and out (i.e., modulating the lightness factor). Two metrics affect the animation: precipitation probability and intensity.
//
// Probability affects the intensity of the fading (i.e., how big the change in lightness is). When there is a low change of rain, the pixel's lightness will change only slightly, and thus be barely noticeable.
//
// Intensity affects the speed of the animation. The more intense the precipitation, the faster pixels will fade in and out.
//
// Low probability will result in a slow, non-regular periods. The uncertainty is represented by 
//
// are used to control the animation
//
// Precipitation is shown in two ways: probability and intensity.
//
// Probability is shown with a fadin
//
// > A very rough guide is that a value of 0 in./hr. corresponds to no
// > precipitation, 0.002 in./hr. corresponds to very light precipitation,
// 0.017in./hr. corresponds to light precipitation, 0.1 in./hr. corresponds to
// moderate precipitation, and 0.4 in./hr. corresponds to heavy precipitation.

// Take weather data from forecast.io and return a time-series array of data,
// each containing a z-scale "time" and data used for the effect.
function normalizeWeatherData(weatherData, time) {
  if (TEST_TEMP_COLORS) {
    return [
      {
        time: 0,
        apparentTemperature: COLD_DEG,
        precipProbability: 1,
        precipIntensity: 0.4,
      },
      {
        time: 1,
        apparentTemperature: HOT_DEG,
        precipProbability: 0,
        precipIntensity: 0,
      },
    ];
  }
  var hours = weatherData.hourly.data.map(function(hour) {
    return {
      time: hour.time * 1000,
      x: (hour.time - time) / DOMAIN_PERIOD,
      apparentTemperature: hour.apparentTemperature,
      precipProbability: hour.precipProbability,
      precipIntensity: hour.precipIntensity,
    };
  });

  hours.sort(function(a, b) {
    return a.time - b.time;
  });

  var first = findLastIndex(hours, function(hour) {
    return hour.time <= time;
  });
  var last = findFirstIndex(hours, function(hour) {
    return hour.time >= (time + DOMAIN_PERIOD);
  });
  if (first === -1 || last === -1) {
    return [];
  }
  return hours.slice(first, last + 1);
}

var HUE_INTERPOLATION = [
  {
    score: COLD_DEG,
    value: COLD_HUE,
  },
  {
    score: NORMAL_DEG,
    value: NORMAL_HUE,
  },
  {
    score: HOT_DEG,
    value: HOT_HUE,
  },
];

function getTemperatureHue(temp) {
  return lerp(HUE_INTERPOLATION, temp, {
    getX: function(def) {
      return def.score;
    },
    getY: function(def) {
      return def.value;
    },
  });
}

function getPrecipAnimationLightness(time, data) {
  var period = 1000;
  // (0.4 / (data.precipIntensity / 0.4))
  var x = (time % period) / period;
  console.log(data.precipProbability, x, scale(data.precipProbability, {
    domain: [0, 1],
    range: [1, x],
  }));
  return scale(data.precipProbability, {
    domain: [0, 1],
    range: [1, x],
  });
}

function renderPixels(strand, weather, time) {
  var hours = normalizeWeatherData(weather, time);

  for (var pixelIndex = 0; pixelIndex < strand.length; pixelIndex++) {
    var pixelTime = pixelIndex / (strand.length - 1);
    var pixelWeatherData = lerpWeatherData(hours, pixelTime);
    var color = hsltorgb(
      getTemperatureHue(pixelWeatherData.apparentTemperature),
      1,
      0.5 * getPrecipAnimationLightness(Date.now(), pixelWeatherData)
    );
    strand.setPixel(pixelIndex, color[0], color[1], color[2]);
  }
}

function getHourWeatherTime(value) {
  return value.x;
}

function lerpWeatherData(hours, time) {
  return {
    time: time,
    apparentTemperature: lerp(hours, time, {
      getX: getHourWeatherTime,
      getY: function(def) {
        return def.apparentTemperature;
      },
    }),
    precipProbability: lerp(hours, time, {
      getX: getHourWeatherTime,
      getY: function(def) {
        return def.precipProbability;
      },
    }),
    precipIntensity: lerp(hours, time, {
      getX: getHourWeatherTime,
      getY: function(def) {
        return def.precipIntensity;
      },
    }),
  };
}

function createHueEffect(strand) {
  var weatherData;
  var stream = through.obj(function(newWeatherData, enc, callback) {
    weatherData = newWeatherData;
    start();
    callback();
  });

  // Create a function to be called once a weather forecast is obtained to
  // begin rendering
  var start = once(function() {
    // Initial render
    var date = new Date(weatherData.hourly.data[0].time * 1000);
    renderPixels(strand, weatherData, date.getTime());
    stream.push(strand);

    // Update color once every PERIOD
    setInterval(function() {
      renderPixels(strand, weatherData, date.getTime());
      stream.push(strand);
    }, 50);
  });

  return stream;
}

function createPrecipitationEffect(strand) {
  var stream = through.obj(function(newWeatherData, enc, callback) {
    this.push(strand);
    callback();
  });
  return stream;
}

module.exports = function(strand) {
  var effects = [
    createHueEffect(createStrand(strand.length)),
    createPrecipitationEffect(createStrand(strand.length)),
  ];
  var combinedEffect = combineEffects(
    strand,
    effects,
    function(strand, strandData) {
      return strandData[0];
    }
  );
  // Update weather forecast periodically
  (function updateWeather() {
    forecastWeather(function(err, weatherData) {
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
  })();
  return combinedEffect;
};
