'use strict';

const scale = require("../../lib/scale");
const lerp = require("../../lib/lerp");
const hsltorgb = require("hsl-to-rgb");
const through = require("through2");
const once = require("once");
const normalizeWeatherData = require("./normalize-data");

const DOMAIN_PERIOD = 1000 * 60 * 60 * 12; // 12 hours
const ANIMATION_RENDER_INTERVAL = 50;
const NO_ANIMATION_RENDER_INTERVAL = 1000 * 60; // 1 minute

function clamp(num, min, max) {
  return Math.max(Math.min(num, max), min);
}

// Intensity (period, ms)
// high: 200-800
// medium: 500-2000
// low: 1500-3000
//
// Probability (lightness change)
// high:
//
// Intensity (delay)
// high: 0-800
// medium: 800-1500
// low: 1500-2500
//
// ## Intensity (mm/hr)
//
// Intensity is measured in millimeters of rain per hour:
//
// * 0-2.5mm: Light
// * 2.5-10mm: Moderate
// * 10mm-50mm: Heavy
// * 50mm+: Violent
//
// > Light rain — when the precipitation rate is < 2.5 mm (0.098 in) per hour
// > Moderate rain — when the precipitation rate is between 2.5 mm (0.098 in) -
// > 7.6 mm (0.30 in) or 10 mm (0.39 in) per hour[105][106]
// > Heavy rain — when the precipitation rate is > 7.6 mm (0.30 in) per
// > hour,[105] or between 10 mm (0.39 in) and 50 mm (2.0 in) per hour[106]
// > Violent rain — when the precipitation rate is > 50 mm (2.0 in) per
// > hour[106]
// >
// > https://en.wikipedia.org/wiki/Rain#Intensity
//
// ### Animation
//
// Intensity will impact the animation's timing:
//
// 1. Duration of the animation
// 2. Delay between animation
//
// These will both impact the concurrent number of animations.
//
// #### Timing Function (Future Consideration)
//
// It might also make sense for intensity to change the timing function
// (easing).
//
// ### Formula
//
// Non-normative:
//
// * Light: 1500-3000
// * Moderate: 500-2000
// * Heavy: 200-800
// * Violent: 0
//
// 1mm: 2000 (1000-3000)
// 2.5mm: 1500 (750-2250)
// 5mm: 1000 (500-1500)
// 10mm: 500 (250-750)
// 50mm: 0 (0-100)
//
//


// ## Precipitation
//
// Precipitation is shown with pixels animated to fade in and out (i.e.,
// modulating the lightness factor). Two metrics affect the animation:
// precipitation probability and intensity.
//
// Probability affects the intensity of the fading (i.e., how big the change
// in lightness is). When there is a low change of rain, the pixel's lightness
// will change only slightly, and thus be barely noticeable.

// ## Precipitation (Old)
//
// Precipitation is shown with pixels animated to fade in and out (i.e.,
// modulating the lightness factor). Two metrics affect the animation:
// precipitation probability and intensity.
//
// Probability affects the intensity of the fading (i.e., how big the change
// in lightness is). When there is a low change of rain, the pixel's lightness
// will change only slightly, and thus be barely noticeable.
//
// Intensity affects the speed of the animation. The more intense the
// precipitation, the faster pixels will fade in and out.
//
// Low probability will result in a slow, non-regular periods. The uncertainty
// is represented by
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
const PRECIP_INTENSITY_MODERATE = 2.5;
const PRECIP_INTENSITY_HEAVY = 10;
const PRECIP_INTENSITY_VIOLENT = 50;

const PRECIP_LERP_DURATIONS = [
  {
    precipIntensity: 0,
    duration: 3600,
  },
  {
    precipIntensity: PRECIP_INTENSITY_MODERATE,
    duration: 1200,
  },
  {
    precipIntensity: PRECIP_INTENSITY_HEAVY,
    duration: 400,
  },
  {
    precipIntensity: PRECIP_INTENSITY_VIOLENT,
    duration: 100,
  },
];

const PRECIP_LERP_DELAY = [
  {
    precipIntensity: 0,
    delay: 4500,
  },
  {
    precipIntensity: PRECIP_INTENSITY_MODERATE,
    delay: 1500,
  },
  {
    precipIntensity: PRECIP_INTENSITY_HEAVY,
    delay: 300,
  },
  {
    precipIntensity: PRECIP_INTENSITY_VIOLENT,
    delay: 0,
  },
];

const LERP_LIGHTNESS_CHANGE = [
  {
    precipProbability: 0,
    lightnessChange: 0,
  },
  {
    precipProbability: 0.05,
    lightnessChange: 0,
  },
  {
    precipProbability: 1,
    lightnessChange: 1,
  },
];

function getAnimationSeed(time, index) {
  return null;
}

function getLerpedIntensityValue(seed, weather, lerpOpts) {
  const precipIntensity = scale(weather.precipIntensity, {
    domain: [0, PRECIP_INTENSITY_VIOLENT],
  });
  const duration = lerp(lerpOpts.defs, precipIntensity, {
    getX: lerpOpts.getX,
    getY: lerpOpts.getY,
  });
  const maxVariance = Math.max(100, 0.5 * duration);
  return scale(Math.random(), {
    domain: [0, 1],
    range: [duration + maxVariance, Math.max(0, duration - maxVariance)],
  });
}

function getDuration(seed, weather) {
  return getLerpedIntensityValue(seed, weather, {
    defs: PRECIP_LERP_DURATIONS,
    getX: function getX(def) {
      return def.precipIntensity;
    },
    getY: function getY(def) {
      return def.duration;
    },
  });
}

function getDelay(seed, weather) {
  return getLerpedIntensityValue(seed, weather, {
    defs: PRECIP_LERP_DELAY,
    getX: function getX(def) {
      return def.precipIntensity;
    },
    getY: function getY(def) {
      return def.delay;
    },
  });
}

function getLightnessChange(seed, weather) {
  const precipProbability = clamp(weather.precipProbability, 0, 1);
  return lerp(LERP_LIGHTNESS_CHANGE, precipProbability, {
    getX: def => def.precipProbability,
    getY: def => def.lightnessChange,
  });
}

function getPrecipitationLightness(timeX, lightness) {
  return scale(timeX, {
    domain: [0, 1],
    range: [clamp(1 - lightness, 0, 1) / 2, 0.5],
  });
}

function createPrecipAnimation(seed, startTime, weather) {
  const duration = getDuration(seed, weather);
  const delay = getDelay(seed, weather);
  const lightness = getLightnessChange(seed, weather);
  return {
    getLightness(time) {
      const timeX = scale(time, {
        domain: [startTime, startTime + duration],
        range: [0, 1],
      });
      return getPrecipitationLightness(timeX, lightness);
    },
    isEnded(time) {
      return time > (startTime + duration + delay);
    },
  };
}

// input state: strand, animations
// params: time, weather
// output: mutates input state
function renderPixels(props) {
  const {
    animations,
    strand,
    hourlyData,
    time,
  } = props;
  for (let pixelIndex = 0; pixelIndex < strand.length; pixelIndex += 1) {
    let animation = animations[pixelIndex];
    if (!animation || animation.isEnded(time)) {
      const pixelTimeZ = pixelIndex / (strand.length - 1);
      const pixelTime = time + (pixelTimeZ * DOMAIN_PERIOD);
      const seed = getAnimationSeed(time, pixelIndex);
      // eslint-disable-next-line no-param-reassign
      animation = animations[pixelIndex] = createPrecipAnimation(
        seed,
        time,
        {
          precipProbability: lerp(hourlyData, pixelTime, {
            getX: def => def.time,
            getY: def => def.precipProbability,
          }),
          precipIntensity: lerp(hourlyData, pixelTime, {
            getX: def => def.time,
            getY: def => def.precipIntensity,
          }),
        }
      );
    }
  }

  for (let pixelIndex = 0; pixelIndex < strand.length; pixelIndex += 1) {
    const animation = animations[pixelIndex];
    const lightness = animation ? animation.getLightness(time) : 1;
    const color = hsltorgb(0, 0, lightness);
    strand.setPixel(pixelIndex, color[0], color[1], color[2]);
  }
}

function isAnimating(animations) {
  return Object.keys(animations).some(function isNotAnimationEnded(key) {
    return animations[key] && !animations[key].isEnded();
  });
}

function hasNoPrecip(hourlyData, time, period) {
  return hourlyData
    .filter(hour =>
      hour.time >= time &&
      hour.time <= (time + period)
    )
    .every(hour =>
      hour.precipIntensity === 0 &&
      hour.precipProbability === 0
    );
}

module.exports = function createPrecipEffect(strand) {
  const animations = {};
  let weatherData = null;
  let hourlyData = null;
  let startTime = null;
  const stream = through.obj(function(newWeatherData, enc, callback) {
    weatherData = newWeatherData;
    hourlyData = normalizeWeatherData(newWeatherData.data);
    startTime = Date.now();
    // eslint-disable-next-line no-use-before-define
    start();
    callback();
  });

  // Create a function to be called once a weather forecast is obtained to
  // begin rendering
  const start = once(function loop() {
    const dt = Date.now() - startTime;
    const time = weatherData.time + dt;
    const noPrecip = hasNoPrecip(hourlyData, time, DOMAIN_PERIOD);
    const delay = noPrecip ?
      NO_ANIMATION_RENDER_INTERVAL :
      ANIMATION_RENDER_INTERVAL;
    renderPixels({
      animations,
      strand,
      hourlyData,
      time,
    });
    stream.push(strand);
    setTimeout(loop, delay);
  });

  return stream;
};
