"use strict";

const ForecastIO = require("forecast.io");
const log = require("bole")("forecast");

const SF_LAT_LONG = [37.7833, -122.4167];

// ## Forecast.io API
//

const FORECASTIO_KEY = process.env.FORECASTIO_KEY;
const forecastApi = new ForecastIO({
  APIKey: FORECASTIO_KEY,
  timeout: 10000,
});

module.exports = function forecast(callback) {
  const start = Date.now();
  const options = {
    exclude: "currently,minutely,daily,alerts",
  };
  log.debug("request");
  forecastApi.get(
    SF_LAT_LONG[0],
    SF_LAT_LONG[1],
    options,
    function(err, resp, data) {
      log.info({
        err,
        elapsed: Date.now() - start,
      }, "response");
      if (err) {
        callback(err);
      }
      else {
        callback(null, data);
      }
    }
  );
};
