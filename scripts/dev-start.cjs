#!/usr/bin/env node
/**
 * WOD Wiki Unified Development Startup Script
 * 
 * Launches all development services with a single command:
 * - Storybook (web app) on http://localhost:6006
 * - Relay Server (WebSocket) on ws://localhost:8080/ws
 * - Metro Bundler (TV app) on http://localhost:8081
 * - Android TV Emulator (optional)
 * 
 * Usage:
 *   node scripts/dev-start.cjs [options]
 * 
 * Options:
 *   --no-emulator     Skip starting the Android TV emulator
 *   --avd <name>      Specify the AVD name to use (default: tv_api_33)
 *   --web-only        Run only Storybook + Relay Server (no TV app)
 * 
 * Debug Ports:
 *   - Storybook: Use `npm run storybook:debug` for --inspect=9229
 *   - Relay Server: Add NODE_OPTIONS=--inspect=9230 when debugging
 *   - TV App: Use React Native Debugger / Flipper via Metro bundler
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Validate AVD name to prevent command injection
function isValidAvdName(name) {
  // AVD names should only contain alphanumeric characters, underscores, and hyphens
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    noEmulator: false,
    avdName: 'tv_api_33',
    webOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--no-emulator') {
      options.noEmulator = true;
    } else if (arg === '--avd' && args[i + 1]) {
      const avdName = args[++i];
      if (!isValidAvdName(avdName)) {
        console.error(`Error: Invalid AVD name "${avdName}". AVD names should only contain alphanumeric characters, underscores, and hyphens.`);
        process.exit(1);
      }
      options.avdName = avdName;
    } else if (arg === '--web-only') {
      options.webOnly = true;
    }
  }

  return options;
}

// Log with color and prefix
function log(prefix, color, message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${prefix}]${colors.reset} ${timestamp} - ${message}`);
}

// Check if a command exists on the system
function commandExists(cmd) {
  try {
    const command = process.platform === 'win32' 
      ? `where ${cmd} 2>nul` 
      : `command -v ${cmd} >/dev/null 2>&1`;
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Check if dependencies are installed in a directory
function checkDependencies(dir, name) {
  const nodeModulesPath = path.join(dir, 'node_modules');
  const packageJsonPath = path.join(dir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    log(name, colors.yellow, `No package.json found in ${dir}, skipping dependency check`);
    return true;
  }

  if (!fs.existsSync(nodeModulesPath)) {
    log(name, colors.yellow, `node_modules not found, installing dependencies...`);
    try {
      execSync('npm install', { cwd: dir, stdio: 'inherit' });
      log(name, colors.green, `Dependencies installed successfully`);
    } catch (err) {
      log(name, colors.red, `Failed to install dependencies: ${err.message}`);
      return false;
    }
  } else {
    log(name, colors.green, `Dependencies already installed`);
  }
  return true;
}

// Check if an Android emulator is already running
function isEmulatorRunning() {
  if (!commandExists('adb')) {
    return false;
  }
  try {
    const output = execSync('adb devices', { encoding: 'utf8' });
    const lines = output.trim().split('\n').slice(1);
    return lines.some(line => line.includes('emulator') && line.includes('device'));
  } catch {
    return false;
  }
}

// Start the Android TV emulator
function startEmulator(avdName) {
  if (!commandExists('emulator')) {
    log('EMULATOR', colors.yellow, 'Android emulator command not found. Make sure Android SDK is installed and in PATH');
    log('EMULATOR', colors.yellow, 'Skipping emulator startup...');
    return null;
  }

  if (isEmulatorRunning()) {
    log('EMULATOR', colors.green, 'Emulator is already running');
    return null;
  }

  log('EMULATOR', colors.cyan, `Starting Android TV emulator (AVD: ${avdName})...`);
  
  // Start emulator in detached/background mode
  const emulatorProcess = spawn('emulator', ['-avd', avdName], {
    detached: true,
    stdio: 'ignore',
  });
  
  emulatorProcess.unref();
  
  log('EMULATOR', colors.green, `Emulator starting in background (PID: ${emulatorProcess.pid})`);
  log('EMULATOR', colors.cyan, 'Waiting for emulator to boot (this may take a minute)...');
  
  return emulatorProcess;
}

// Main execution
async function main() {
  const options = parseArgs();
  const rootDir = path.resolve(__dirname, '..');
  const serverDir = path.join(rootDir, 'server');
  const tvDir = path.join(rootDir, 'tv');

  console.log('');
  console.log(`${colors.bright}${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║           WOD Wiki Development Environment                   ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');

  // Print configuration
  log('CONFIG', colors.magenta, `Mode: ${options.webOnly ? 'Web Only' : 'Full Stack'}`);
  log('CONFIG', colors.magenta, `Emulator: ${options.noEmulator || options.webOnly ? 'Disabled' : 'Enabled'}`);
  if (!options.noEmulator && !options.webOnly) {
    log('CONFIG', colors.magenta, `AVD Name: ${options.avdName}`);
  }
  console.log('');

  // Check dependencies
  log('DEPS', colors.blue, 'Checking dependencies...');
  console.log('');

  const dirs = [
    { path: rootDir, name: 'ROOT' },
    { path: serverDir, name: 'SERVER' },
  ];
  
  if (!options.webOnly) {
    dirs.push({ path: tvDir, name: 'TV' });
  }

  for (const { path: dir, name } of dirs) {
    if (!checkDependencies(dir, name)) {
      log('ERROR', colors.red, `Failed to setup ${name} dependencies. Exiting.`);
      process.exit(1);
    }
  }
  console.log('');

  // Start emulator if needed
  if (!options.noEmulator && !options.webOnly) {
    startEmulator(options.avdName);
    console.log('');
  }

  // Print service information
  log('INFO', colors.cyan, 'Starting services...');
  console.log('');
  console.log(`${colors.bright}Services:${colors.reset}`);
  console.log(`  ${colors.green}▸ Storybook (Web):${colors.reset}      http://localhost:6006`);
  console.log(`  ${colors.yellow}▸ Relay Server (WS):${colors.reset}    ws://localhost:8080/ws`);
  if (!options.webOnly) {
    console.log(`  ${colors.magenta}▸ Metro Bundler:${colors.reset}        http://localhost:8081`);
  }
  console.log('');
  console.log(`${colors.bright}Debug Ports:${colors.reset}`);
  console.log(`  ${colors.cyan}▸ Storybook Debug:${colors.reset}      Use 'npm run storybook:debug' for --inspect=9229`);
  console.log(`  ${colors.cyan}▸ Relay Server Debug:${colors.reset}   Add NODE_OPTIONS=--inspect=9230`);
  if (!options.webOnly) {
    console.log(`  ${colors.cyan}▸ TV App Debug:${colors.reset}         React Native Debugger / Flipper via Metro`);
  }
  console.log('');
  console.log(`${colors.bright}Press Ctrl+C to stop all services${colors.reset}`);
  console.log('');

  // Build concurrently command
  const services = [
    { name: 'storybook', command: 'npm run storybook', color: 'green' },
    { name: 'relay', command: 'npm run dev', cwd: 'server', color: 'yellow' },
  ];

  if (!options.webOnly) {
    services.push({ name: 'metro', command: 'npm start', cwd: 'tv', color: 'magenta' });
  }

  // Build service commands
  const commands = services.map(service => {
    return service.cwd 
      ? `"cd ${service.cwd} && ${service.command}"`
      : `"${service.command}"`;
  });

  // Build concurrently arguments
  const concurrentlyArgs = [
    'concurrently',
    '--kill-others-on-fail',
    '--prefix', '[{name}]',
    '--names', services.map(s => s.name).join(','),
    '--prefix-colors', services.map(s => s.color).join(','),
    ...commands,
  ];

  // Use npx to run concurrently
  const concurrentlyProcess = spawn('npx', concurrentlyArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  });

  concurrentlyProcess.on('error', (err) => {
    log('ERROR', colors.red, `Failed to start services: ${err.message}`);
    process.exit(1);
  });

  concurrentlyProcess.on('exit', (code) => {
    if (code !== 0) {
      log('EXIT', colors.red, `Services exited with code ${code}`);
    } else {
      log('EXIT', colors.green, 'All services stopped');
    }
    process.exit(code || 0);
  });

  // Handle SIGINT for graceful shutdown
  process.on('SIGINT', () => {
    log('SHUTDOWN', colors.yellow, 'Received SIGINT, stopping services...');
    concurrentlyProcess.kill('SIGINT');
  });
}

main().catch((err) => {
  log('ERROR', colors.red, `Unexpected error: ${err.message}`);
  process.exit(1);
});
