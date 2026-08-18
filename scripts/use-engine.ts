// Dependency Manager for @bitcobblers/wod-wiki-* in wod-wiki
/**
 * Supports 4 modes:
 *   1. "workspace" (or "local") -> Point dependencies in root, packages/*, apps/* to local workspace:*
 *   2. "npm" (or "release")     -> Install published npm packages (default: "^0.1.0" or specific semver)
 *   3. "link"                   -> Use bun link / npm link to link local built packages from sibling repo
 *   4. "tarballs"               -> Point to local .tar.gz / .tgz files (e.g. from engine pack:all)
 *
 * Usage:
 *   bun scripts/use-engine.ts mode [args]
 *   bun scripts/use-engine.ts npm [--version 0.1.0]
 *   bun scripts/use-engine.ts workspace
 *   bun scripts/use-engine.ts link [--engine-dir ../wod-wiki-engine]
 *   bun scripts/use-engine.ts tarballs [--dir ../wod-wiki-engine/tarballs]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');

const ALL_PACKAGES = [
  '@bitcobblers/wod-wiki-core',
  '@bitcobblers/wod-wiki-lang',
  '@bitcobblers/wod-wiki-wql',
  '@bitcobblers/wod-wiki-engine',
  '@bitcobblers/wod-wiki-ui',
];

function getPackageJsonPaths(): string[] {
  const list = [path.join(rootDir, 'package.json')];
  for (const base of ['packages', 'apps']) {
    const fullBase = path.join(rootDir, base);
    if (fs.existsSync(fullBase)) {
      for (const entry of fs.readdirSync(fullBase, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const p = path.join(fullBase, entry.name, 'package.json');
          if (fs.existsSync(p)) list.push(p);
        }
      }
    }
  }
  return list;
}

function run(cmd: string, cwd = rootDir) {
  console.log(`\x1b[36m$ ${cmd}\x1b[0m (in ${path.relative(rootDir, cwd) || '.'})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return null;
}

const mode = process.argv[2] || 'status';

switch (mode) {
  case 'npm':
  case 'release': {
    const version = getArg('--version') || '^0.1.0';
    console.log(`\x1b[32m[use-engine]\x1b[0m Switching all packages to npm dependencies @ \x1b[33m${version}\x1b[0m...`);

    const pkgPaths = getPackageJsonPaths();
    for (const pPath of pkgPaths) {
      const pkg = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
      for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
        if (pkg[depType]) {
          for (const depName of Object.keys(pkg[depType])) {
            if (depName.startsWith('@bitcobblers/wod-wiki-')) {
              pkg[depType][depName] = version;
            }
          }
        }
      }
      fs.writeFileSync(pPath, JSON.stringify(pkg, null, 2) + '\n');
    }

    run('bun install');
    console.log(`\x1b[32m✔ Switched to npm release version ${version}\x1b[0m`);
    break;
  }

  case 'workspace':
  case 'local': {
    console.log(`\x1b[32m[use-engine]\x1b[0m Switching to local workspace:* dependencies...`);

    const pkgPaths = getPackageJsonPaths();
    for (const pPath of pkgPaths) {
      const pkg = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
      for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
        if (pkg[depType]) {
          for (const depName of Object.keys(pkg[depType])) {
            if (depName.startsWith('@bitcobblers/wod-wiki-')) {
              pkg[depType][depName] = 'workspace:*';
            }
          }
        }
      }
      fs.writeFileSync(pPath, JSON.stringify(pkg, null, 2) + '\n');
    }

    run('bun install');
    console.log(`\x1b[32m✔ Switched to workspace:* dependencies\x1b[0m`);
    break;
  }

  case 'link': {
    const defaultEngineDir = path.resolve(rootDir, '../wod-wiki-engine');
    const engineDir = path.resolve(rootDir, getArg('--engine-dir') || defaultEngineDir);

    if (!fs.existsSync(engineDir)) {
      console.error(`\x1b[31mEngine repository not found at ${engineDir}\x1b[0m`);
      process.exit(1);
    }

    console.log(`\x1b[32m[use-engine]\x1b[0m Linking packages from \x1b[33m${engineDir}\x1b[0m...`);

    // 1. In engine repo, register bun link for all packages
    for (const p of ['core', 'lang', 'wql', 'engine', 'ui']) {
      const pDir = path.join(engineDir, 'packages', p);
      if (fs.existsSync(pDir)) {
        run('bun link', pDir);
      }
    }

    // 2. In consumer repo, link direct consumed packages
    for (const p of ALL_PACKAGES) {
      try {
        run(`bun link ${p}`, rootDir);
      } catch {
        // ignore if root does not directly consume this one
      }
    }

    console.log(`\x1b[32m✔ Linked engine packages successfully.\x1b[0m`);
    break;
  }

  case 'tarballs': {
    const defaultTarballsDir = path.resolve(rootDir, '../wod-wiki-engine/tarballs');
    const tarballsDir = path.resolve(rootDir, getArg('--dir') || defaultTarballsDir);

    if (!fs.existsSync(tarballsDir)) {
      console.error(`\x1b[31mTarballs directory not found at ${tarballsDir}\x1b[0m`);
      process.exit(1);
    }

    console.log(`\x1b[32m[use-engine]\x1b[0m Pointing dependencies to tarballs in \x1b[33m${tarballsDir}\x1b[0m...`);
    const files = fs.readdirSync(tarballsDir).filter((f) => f.endsWith('.tgz'));
    const pkgPaths = getPackageJsonPaths();

    for (const pPath of pkgPaths) {
      const pkg = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
      for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
        if (pkg[depType]) {
          for (const depName of Object.keys(pkg[depType])) {
            if (depName.startsWith('@bitcobblers/wod-wiki-')) {
              const baseName = depName.replace('@bitcobblers/', '');
              const match = files.find((f) => f.startsWith(baseName) || f.includes(baseName.replace('wod-wiki-', '')));
              if (match) {
                const fullPath = path.join(tarballsDir, match);
                pkg[depType][depName] = `file:${path.relative(path.dirname(pPath), fullPath)}`;
                console.log(`  [${path.basename(path.dirname(pPath))}] ${depName} -> ${pkg[depType][depName]}`);
              }
            }
          }
        }
      }
      fs.writeFileSync(pPath, JSON.stringify(pkg, null, 2) + '\n');
    }

    run('bun install');
    console.log(`\x1b[32m✔ Pointed dependencies to tarballs.\x1b[0m`);
    break;
  }

  case 'status':
  default: {
    console.log(`\x1b[36m[use-engine]\x1b[0m Current @bitcobblers/wod-wiki-* dependencies:`);
    const pkgPaths = getPackageJsonPaths();
    for (const pPath of pkgPaths) {
      const pkg = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
      const found: string[] = [];
      for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
        if (pkg[depType]) {
          for (const [k, v] of Object.entries(pkg[depType])) {
            if (k.startsWith('@bitcobblers/wod-wiki-')) {
              found.push(`${k}: \x1b[33m${v}\x1b[0m`);
            }
          }
        }
      }
      if (found.length > 0) {
        console.log(`  \x1b[1m${path.relative(rootDir, pPath)}\x1b[0m:`);
        for (const item of found) {
          console.log(`    ${item}`);
        }
      }
    }
    console.log(`\nAvailable modes:`);
    console.log(`  bun scripts/use-engine.ts npm [--version <semver>]`);
    console.log(`  bun scripts/use-engine.ts workspace`);
    console.log(`  bun scripts/use-engine.ts link [--engine-dir <path>]`);
    console.log(`  bun scripts/use-engine.ts tarballs [--dir <path>]`);
    break;
  }
}
