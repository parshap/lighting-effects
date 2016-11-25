"use strict";

module.exports = function normalizeHourlyWeather(weatherData) {
  return weatherData.hourly.data
    .map(function(hour) {
      return {
        time: hour.time * 1000,
        apparentTemperature: hour.apparentTemperature,
        precipProbability: hour.precipProbability,
        precipIntensity: hour.precipIntensity,
      };
    })
    .sort(function(a, b) {
      return a.time - b.time;
    });
};
