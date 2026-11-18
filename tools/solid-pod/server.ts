#!/usr/bin/env -S tsx
/**
 * Local Community Solid Server (CSS) setup and launcher
 * 
 * Starts a local CSS instance on port 3001 for development and testing.
 * Data is stored in .data/css directory.
 * 
 * Usage:
 *   npm run pod:start
 * 
 * Requirements:
 *   - Node.js 18+
 *   - CSS installed via npm
 */

import { spawn } from 'child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// Configuration
const PORT = 3001;
const DATA_DIR = join(__dirname, '.data', 'css');
const CONFIG_FILE = join(__dirname, '.data', 'css-config.json');

/**
 * Setup data directory
 */
const setupDataDir = (): void => {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${DATA_DIR}`);
  }
};

/**
 * Create CSS configuration file
 */
const createConfig = (): void => {
  const config = {
    podName: 'FitPod Local Pod',
    port: PORT,
    rootDirectory: DATA_DIR,
    webIdEnabled: true,
    credentials: {
      password: 'password', // Default password for testing
      accounts: {
        user: 'password',
      },
    },
  };

  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  console.log(`Created CSS config: ${CONFIG_FILE}`);
};

/**
 * Check if CSS is installed
 */
const checkCssInstalled = (): boolean => {
  try {
    import.meta.resolve('@solid/community-server');
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Install CSS if not present
 */
const installCss = (): Promise<void> => {
  console.log('Community Solid Server not found. Installing...');

  return new Promise((resolve, reject) => {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const proc = spawn(npm, ['install', '@solid/community-server', '--save-dev'], {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('CSS installed successfully');
        resolve();
      } else {
        reject(new Error(`CSS installation failed with code ${code}`));
      }
    });
  });
};

/**
 * Start CSS server
 */
const startCss = async (): Promise<void> => {
  console.log(`\nStarting Community Solid Server on port ${PORT}...`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`\nOpen http://localhost:${PORT} in your browser`);
  console.log(`OIDC Issuer: http://localhost:${PORT}/\n`);

  return new Promise((resolve, reject) => {
    const serverPath = fileURLToPath(import.meta.resolve('@solid/community-server/bin/server.js'));
    const css = spawn(
      process.execPath,
      [serverPath, '-p', String(PORT), '-f', DATA_DIR],
      {
        stdio: 'inherit',
      }
    );

    css.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`CSS exited with code ${code}`));
      }
    });

    css.on('error', (error) => {
      reject(error);
    });

    if (css.stdout) {
      css.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);
      });
    }

    if (css.stderr) {
      css.stderr.on('data', (data) => {
        console.error(data.toString());
      });
    }

    // Graceful shutdown
    const shutdown = () => {
      console.log('\nStopping CSS...');
      css.kill('SIGTERM');
      setTimeout(() => {
        css.kill('SIGKILL');
      }, 5000);
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    console.log('CSS started. Press Ctrl+C to stop.\n');
    resolve();
  });
};

/**
 * Main entry point
 */
const main = async (): Promise<void> => {
  console.log('=== FitPod Local Solid Pod Setup ===\n');

  // Setup
  setupDataDir();
  createConfig();

  // Check and install CSS
  if (!checkCssInstalled()) {
    try {
      await installCss();
    } catch (error) {
      console.error('Failed to install CSS:', error);
      console.log('\nManually install with:');
      console.log('  npm install @solid/community-server --save-dev');
      process.exit(1);
    }
  }

  // Start server
  try {
    await startCss();
  } catch (error) {
    console.error('Failed to start CSS:', error);
    process.exit(1);
  }
};

main();
