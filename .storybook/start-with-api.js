import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Start API server
console.log('🚀 Starting Workout API server...');
const apiServer = spawn('node', [path.join(__dirname, 'api', 'server.js')], {
  stdio: 'inherit',
  env: { ...process.env, API_PORT: '6007' }
});

// Wait a moment for API server to start
setTimeout(() => {
  console.log('🚀 Starting Storybook...');
  
  // Start Storybook
  const storybook = spawn('npm', ['run', 'prestorybook'], {
    stdio: 'inherit',
    shell: true
  });

  storybook.on('exit', (code) => {
    console.log('Storybook exited, shutting down API server...');
    apiServer.kill();
    process.exit(code);
  });
}, 1000);

// Handle cleanup
process.on('SIGTERM', () => {
  apiServer.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  apiServer.kill();
  process.exit(0);
});
