// UUID mock for Jest - uuid 14.0.0 is ESM only
module.exports = {
  v4: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  v1: () => 'test-uuid-v1-' + Date.now(),
};
module.exports.default = module.exports;
