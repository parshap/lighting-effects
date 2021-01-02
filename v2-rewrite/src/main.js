/**
 * This module is the main entry point and render loop.
 */

const createKnightRiderEffect = require("./effects/knightRider");
const createEffectManager = require("./effectManager");
const loop = require("./loop");

/**
 * Loop
 *
 * setNextDesiredTick(ms)
 * forceTick()
 */

/**
 * Context provider
 *
 * Should they be pull or push based? E.g., weather provider pushes weather
 * update every n minutes, or effect requests updated weather every n minutes?
 *
 * Should providers have a render() called?
 */

module.exports = ({ strand }) => {
  const providerManager = createProviderManager();
  const effectManager = createEffectManager({
    strand,
  });
  effectManager.setEffect(createKnightRiderEffect);
  // @TODO context
  const { setNextDesiredTick, forceTick } = loop(({ time }) => {
    effectManager.render({
      time,
      ...providerManager.context,
    });
    setNextDesiredTick(effectManager.getNextDesiredTick());
  });
};
