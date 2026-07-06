// e2e/global-setup.js — Start backend server before E2E tests (local mode only)
const { spawn } = require('child_process');
const { execSync } = require('child_process');
const path = require('path');
const __dirname = path.dirname(__filename);

let backendProc = null;

function startBackend() {
    const projectRoot = path.resolve(__dirname, '../..'); // from frontend/e2e → project root
  return new Promise((resolve) => {
    try {
    backendProc = spawn(
         'bun', ['run', 'dist/index.js'],
        {
          cwd: path.join(projectRoot, 'backend'),
           env: {
              ...process.env,
            DATABASE_URL: `file:${path.join(projectRoot, 'backend', 'data.db')}`,
           BENCH_MOCK: 'true',
           PORT: '8080',
             },
          stdio: ['ignore', 'pipe', 'pipe'],
              },
         );

    let checkCount = 0;
     const check = () => {
       if (checkCount++ > 30) {
         backendProc?.kill();
        resolve();
           return;
           }
        try {
          execSync('curl -s http://localhost:8080/api/health', { timeout: 2_000 });
         console.log('[setup] Backend ready on port 8080');
          resolve();
             } catch {
            setTimeout(check, 1_000);
              }
     };

      check();

     backendProc.stdout?.on('data', (d) => console.log('[backend]', d.toString().trim()));
     backendProc.stderr?.on('data', (d) => console.error('[backend err]', d.toString().trim()));
       } catch (err) {
       resolve(); // Fail gracefully
        }
    });
   }

module.exports = function globalSetup() {
   startBackend().then(() => {
     console.log('[setup] Backend server started');
      });
  };

function stopBackend() {
   if (backendProc) {
      backendProc.kill('SIGTERM');
       backendProc = null;
        console.log('[teardown] Backend server stopped');
         }
   }

module.exports.stopBackend = stopBackend;
