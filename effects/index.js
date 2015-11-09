"use strict";

var effects = {
  natural: require("./natural"),
  "knight-rider": require("./knight-rider"),
  weather: require("./weather"),
  "weather-rider": require("./weather-rider"),
  "explosions": require("./explosions"),
};


module.exports = function(effectName) {
  var effect = effects[effectName];
  if ( ! effect) {
    throw new Error("Invalid effect: \"" + effectName + "\"");
  }
  return effect;
};
