const pino = require('pino');

/**
 * Custom dev-only transport that writes synchronously to disk so tail -f sees logs immediately.
 */
module.exports = function devFileTransport(opts = {}) {
  const destination = opts.destination || '/tmp/fulfillment-simulation-dev.log';

  return pino.destination({
    dest: destination,
    sync: true,
    mkdir: true,
  });
};
