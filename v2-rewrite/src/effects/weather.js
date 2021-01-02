const weatherScene = (render, { time, weatherData }) => {
  const strandLength = 20;
  const buffer = Buffer.alloc(3 * strandLength);

  const hues = getWeatherHues({
    strandLength,
    time,
    weatherData,
  });
  const precipAlphas = getPrecipAlphas({
    strandLength,
    time,
    weatherData,
  });

  for (let i = 0; i < strandLength; i++) {
    writePixel(buffer, i, hslaToRgb(hues[i], 1, 0.5, precipAlphas[i]));
  }

  return buffer;
};

const createCombinedEffect = ({ buffer, effects, render }) => {
  const effectObjects = _.mapValues(effects, (effectFn) =>
    effectFn({ buffer })
  );
  const buffers = _.mapValues(effectObjects, () => buffer.clone());
  return {
    effects: effectObjects,
    buffers,
    render(context) {
      _.forEach(effects, (effect, key) =>
        effect.render({
          ...context,
          buffer: buffers[key],
        })
      );
      render(context);
    },
  };
};

const createWeatherEffect = ({ buffer }) => {
  const effect = createCombinedEffect({
    buffer,
    effects: {
      precip: (context) =>
        createPrecipEffect({
          ...context,
          // ... options
        }),
      temp: (context) =>
        createTempEffect({
          ...context,
          // ... options
        }),
    },
    render: () => {
      writeOutput({
        buffer,
        precip: effect.buffers.precip,
        temp: effect.buffers.temp,
      });
    },
  });
  return effect;
};

