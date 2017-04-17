"use strict";

const ForecastIO = require("forecast.io");
const async = require("async");
const log = require("bole")("forecast");

const SF_LAT_LONG = [37.7833, -122.4167];

// ## Forecast.io API
//

const FORECASTIO_KEY = process.env.FORECASTIO_KEY;
const forecastApi = new ForecastIO({
  APIKey: FORECASTIO_KEY,
  timeout: 10000,
});

function forecast(opts, callback) {
  forecastApi.get(
    opts.latlong[0],
    opts.latlong[1],
    {
      exclude: opts.exclude,
    },
    function(err, response, data) {
      if (err) {
        callback(err);
      }
      else {
        callback(null, data);
      }
    }
  );
}

function shouldRetry(err) {
  return [
    'ENOTFOUND',
    'ESOCKETTIMEDOUT',
    'ETIMEDOUT',
  ].indexOf(err.code) !== -1;
}

function forecastRetry(opts, callback) {
  async.retry(
    {
      times: 10,
      // intervals of 100, 200, 400, 800, 1600, ... ms
      interval: retryCount => 50 * Math.pow(2, retryCount),
      errorFilter: shouldRetry,
    },
    function(callback) {
      opts.onTry();
      forecast(opts, function(err, data) {
        if (err && shouldRetry(err)) {
          opts.onRetryError(err);
        }
        callback(err, data);
      });
    },
    callback
  );
}

module.exports = function(callback) {
  let tryStart;
  const forecastOpts = {
    latlong: opts.latlong,
    exclude: "currently,minutely,daily,alerts",
    onTry: () => {
      tryStart = Date.now();
    },
    onRetryError: (err) => {
      log.info({
        elapsed: Date.now() - tryStart,
        err,
      }, "retry error");
    },
  };
  log.debug({
    opts: opts,
  }, "request");
  forecastRetry(forecastOpts, function(err, data) {
    log[err ? 'error' : 'info']({
      elapsed: Date.now() - tryStart,
      err,
    }, "response");
    callback(err, data);
  });
};
