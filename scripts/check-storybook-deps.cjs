#!/usr/bin/env bun
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const runtimeRoots = ['src'];
const scanExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mdx']);
const skipDirs = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'storybook-static',
  'test-results',
]);
const importPattern = /(?:import|export)\s+(?:type\s+)?[^'"\n]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function isStorybookPackage(name) {
  return name === 'storybook' || name === 'eslint-plugin-storybook' || name.startsWith('@storybook/');
}

function getPackageRoot(specifier) {
  if (specifier.startsWith('@')) {
    const [scope, name] = specifier.split('/');
    return name ? `${scope}/${name}` : specifier;
  }

  const [name] = specifier.split('/');
  return name;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(absolutePath);
      continue;
    }

    if (entry.isFile() && scanExtensions.has(path.extname(entry.name))) {
      yield absolutePath;
    }
  }
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

const issues = [];
const importedStorybookPackages = new Map();
let scannedFiles = 0;

for (const filePath of walk(repoRoot)) {
  scannedFiles += 1;
  const source = fs.readFileSync(filePath, 'utf8');
  const repoRelativePath = relative(filePath);

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] || match[2] || match[3];
    if (!specifier || specifier.startsWith('.') || specifier.startsWith('/')) {
      continue;
    }

    const packageRoot = getPackageRoot(specifier);
    if (!isStorybookPackage(packageRoot)) {
      continue;
    }

    if (!importedStorybookPackages.has(packageRoot)) {
      importedStorybookPackages.set(packageRoot, new Set());
    }
    importedStorybookPackages.get(packageRoot).add(repoRelativePath);

    if (runtimeRoots.some((root) => repoRelativePath === root || repoRelativePath.startsWith(`${root}/`))) {
      issues.push(
        `Runtime source must not import Storybook packages: ${repoRelativePath} -> ${specifier}`,
      );
    }
  }
}

const sections = {
  dependencies: pkg.dependencies || {},
  devDependencies: pkg.devDependencies || {},
  peerDependencies: pkg.peerDependencies || {},
  optionalDependencies: pkg.optionalDependencies || {},
};

for (const [sectionName, deps] of Object.entries(sections)) {
  for (const dependencyName of Object.keys(deps)) {
    if (sectionName !== 'devDependencies' && isStorybookPackage(dependencyName)) {
      issues.push(
        `Storybook package ${dependencyName} must live in devDependencies, found in ${sectionName}`,
      );
    }
  }
}

for (const [dependencyName, filePaths] of importedStorybookPackages.entries()) {
  if (!sections.devDependencies[dependencyName]) {
    const samplePath = Array.from(filePaths)[0];
    issues.push(
      `Imported Storybook package ${dependencyName} is missing from devDependencies (for example: ${samplePath})`,
    );
  }
}

if (issues.length > 0) {
  console.error('Storybook dependency hygiene check failed.');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

const importedPackages = Array.from(importedStorybookPackages.keys()).sort();
console.log('Storybook dependency hygiene check passed.');
console.log(`- Scanned files: ${scannedFiles}`);
console.log(`- Imported Storybook packages: ${importedPackages.length ? importedPackages.join(', ') : 'none found'}`);
