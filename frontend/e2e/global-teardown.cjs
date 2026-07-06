// e2e/global-teardown.js — Stop backend server after E2E tests (local mode only)
const { stopBackend } = require('./global-setup');

module.exports = function globalTeardown() {
    console.log('[teardown] Stopping backend server...');
  stopBackend();
};
