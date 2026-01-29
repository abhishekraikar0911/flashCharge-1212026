const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 5,
  checkperiod: 10,
  useClones: false
});

function get(key) {
  return cache.get(key);
}

function set(key, value, ttl = 5) {
  return cache.set(key, value, ttl);
}

function del(key) {
  return cache.del(key);
}

function flush() {
  return cache.flushAll();
}

function stats() {
  return cache.getStats();
}

module.exports = { get, set, del, flush, stats };
