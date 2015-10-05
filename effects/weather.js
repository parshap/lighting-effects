"use strict";

var FORECASTIO_KEY = process.env.FORECASTIO_KEY;
var SF_LAT_LONG = [37.7833, -122.4167];
var RENDER_INTERVAL = 1000 * 60; // 1 minute
var WEATHER_UPDATE_INTERVAL = 1000 * 60 * 30; // 30 minutes
var DOMAIN_PERIOD = 1000 * 60 * 60 * 12; // 12 hours
// Temperatures
var COOL_DEG = 50;
var WARM_DEG = 90;
var NORMAL_DEG = 70;
// Colors
var WARM_HUE = 0;
var NORMAL_HUE = 120;
var COOL_HUE = 240;

var through = require("through2");
var once = require("once");
var ForecastIO = require("forecast.io");
var hsltorgb = require("hsl-to-rgb");
var _log = require("bole")("effects/weather");
var log = _log;

var forecast = new ForecastIO({
  APIKey: FORECASTIO_KEY,
  timeout: 10000,
});

function logWeather(weather) {
  log.info({
    hourly: weather.hourly.data.slice(0, 24).map(function(temp) {
      return {
        time: new Date(temp.time * 1000),
        apparentTemperature: temp.apparentTemperature,
      };
    }),
  }, "weather");
}

function forecastWeather(callback) {
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
      callback(null, data);
    }
  });
}

function findFirst(items, fn) {
  var i;
  for (i = 0; i < items.length; i++) {
    if (fn(items[i])) {
      return i;
    }
  }
}

function findLast(items, fn) {
  var i;
  for (i = items.length - 1; i >= 0; i--) {
    if (fn(items[i])) {
      return i;
    }
  }
}

function getTemps(weather, time) {
  var temps = weather.hourly.data.map(function(data) {
    return {
      time: data.time * 1000,
      apparentTemperature: data.apparentTemperature,
    };
  });

  temps = temps.sort(function(a, b) {
    return a.time - b.time;
  });

  var first = findLast(temps, function(temp) {
    return temp.time <= time;
  });
  var last = findFirst(temps, function(temp) {
    return temp.time >= (time + DOMAIN_PERIOD);
  });

  temps = temps.slice(first, last + 1);

  temps = temps.map(function(temp) {
    return {
      z: (temp.time - time) / DOMAIN_PERIOD,
      apparentTemperature: temp.apparentTemperature,
    };
  });

  return temps;
}

function interpolateValue(val1, val2, weight) {
  return val1 * (1 - weight) + val2 * weight;
}

function getInterpolatedTemp(temps, z) {
  var first = findLast(temps, function(temp) {
    return temp.z <= z;
  });
  var last = findFirst(temps, function(temp) {
    return temp.z >= z;
  });

  if (first == null || last == null) {
    return null;
  }

  var a = temps[first];
  var b = temps[last];
  var zz = (z - a.z) / (b.z - a.z) || 0;
  return interpolateValue(a.apparentTemperature, b.apparentTemperature, zz);
}

var HUE_INTERPOLATION = [
  {
    score: COOL_DEG,
    value: COOL_HUE,
  },
  {
    score: NORMAL_DEG,
    value: NORMAL_HUE,
  },
  {
    score: WARM_DEG,
    value: WARM_HUE,
  },
];

function interpolate(points, score) {
  var i;
  for (i = 0; i < points.length; i++) {
    if (points[i].score > score) {
      if (i === 0) {
        return points[0].value;
      }
      else {
        var a = points[i - 1];
        var b = points[i];
        var weight = (score - a.score) / (b.score - a.score);
        return interpolateValue(a.value, b.value, weight);
      }
    }
  }
  if (points.length === 0) {
    return null;
  }
  else {
    return points[points.length - 1].value;
  }
}

function getHue(temp) {
  return interpolate(HUE_INTERPOLATION, temp);
}

function getColor(temp) {
  var hue = getHue(temp);
  if (hue != null) {
    return hsltorgb(hue, 1, 0.5);
  }
}

function renderPixels(strand, weather, time) {
  var temps = getTemps(weather, time);

  for (var i = 0; i < strand.length; i++) {
    var z = i / (strand.length - 1);
    var temp = getInterpolatedTemp(temps, z);
    var color = getColor(temp);
    if (color) {
      strand.setPixel(i, color[0], color[1], color[2]);
    }
  }
}

module.exports = function(strand) {
  var stream = through.obj();
  var weather;

  // Create a function to be called once a weather forecast is obtained to
  // begin rendering
  var start = once(function() {
    // Initial render, bypassing interpolation
    renderPixels(strand, weather, Date.now());
    stream.push(strand.buffer);

    // Update color once every PERIOD
    setInterval(function() {
      renderPixels(strand, weather, Date.now());
      stream.push(strand.buffer);
    }, RENDER_INTERVAL);
  });

  // Update weather forecast periodically
  (function updateWeather() {
    forecastWeather(function(err, w) {
      if (err) {
        stream.emit("error", err);
      }
      else {
        weather = w;
        logWeather(weather);
        start();
      }
      setTimeout(updateWeather, WEATHER_UPDATE_INTERVAL);
    });
  })();

  return stream;
};
