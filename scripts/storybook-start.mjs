#!/usr/bin/env node
/**
 * Starts Storybook dev server with optional HTTPS when HTTPS_CERT / HTTPS_KEY
 * are set in .env.local. Falls back to plain HTTP so anyone cloning the repo
 * can run `bun run storybook` without any extra setup.
 */
import { spawn } from 'child_process';
import { config as loadDotenv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: resolve(root, '.env.local'), override: true });

const args = ['x', 'storybook', 'dev', '-p', '6006', '--host', '0.0.0.0'];

if (process.env.HTTPS_CERT && process.env.HTTPS_KEY) {
  args.push('--https', '--ssl-cert', process.env.HTTPS_CERT, '--ssl-key', process.env.HTTPS_KEY);
}

const child = spawn('bun', args, { stdio: 'inherit', cwd: root });
child.on('exit', (code) => process.exit(code ?? 0));
