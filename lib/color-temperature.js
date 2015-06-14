"use strict";

// From: http://academo.org/demos/colour-temperature-relationship/demo.js?v=1417951003


module.exports = function(Temperature){
  var Red, Green, Blue, rgb;

  Temperature = Temperature / 100;

  if (Temperature <= 66){
    Red = 255;
  } else {
    Red = Temperature - 60;
    Red = 329.698727466 * Math.pow(Red, -0.1332047592);
    if (Red < 0){
      Red = 0;
    }
    if (Red > 255){
      Red = 255;
    }
  }

  if (Temperature <= 66){
    Green = Temperature;
    Green = 99.4708025861 * Math.log(Green) - 161.1195681661;
    if (Green < 0 ) {
      Green = 0;
    }
    if (Green > 255) {
      Green = 255;
    }
  } else {
    Green = Temperature - 60;
    Green = 288.1221695283 * Math.pow(Green, -0.0755148492);
    if (Green < 0 ) {
      Green = 0;
    }
    if (Green > 255) {
      Green = 255;
    }
  }

  if (Temperature >= 66){
    Blue = 255;
  } else {
    if (Temperature <= 19){
      Blue = 0;
    } else {
      Blue = Temperature - 10;
      Blue = 138.5177312231 * Math.log(Blue) - 305.0447927307;
      if (Blue < 0){
        Blue = 0;
      }
      if (Blue > 255){
        Blue = 255;
      }
    }
  }

  rgb = new Array(Math.round(Red),Math.round(Green),Math.round(Blue));
  return rgb;
};
