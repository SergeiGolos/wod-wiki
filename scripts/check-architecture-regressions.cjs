#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
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

const allowedCycleSignatures = [
  'components/Editor/types/index.ts -> components/Editor/types/section.ts',
  'components/Editor/types/index.ts -> components/Editor/utils/documentStructure.ts',
  'parser/WhiteboardScript.ts -> core/index.ts -> core/types/index.ts -> core/types/core.ts',
  'runtime/actions/stack/PushBlockAction.ts -> runtime/contracts/index.ts -> runtime/contracts/IRuntimeBlockStrategy.ts -> runtime/compiler/BlockBuilder.ts',
  'runtime/actions/stack/PushBlockAction.ts -> runtime/contracts/index.ts -> runtime/contracts/IRuntimeBlockStrategy.ts -> runtime/compiler/BlockBuilder.ts -> runtime/behaviors/index.ts -> runtime/behaviors/ChildSelectionBehavior.ts -> runtime/actions/stack/CompileAndPushBlockAction.ts',
  'runtime/actions/stack/PushBlockAction.ts -> runtime/contracts/index.ts -> runtime/contracts/IRuntimeBlockStrategy.ts -> runtime/compiler/BlockBuilder.ts -> runtime/behaviors/index.ts -> runtime/behaviors/ChildSelectionBehavior.ts -> runtime/actions/stack/PushRestBlockAction.ts',
  'runtime/actions/stack/PushBlockAction.ts -> runtime/contracts/index.ts -> runtime/contracts/IRuntimeBlockStrategy.ts -> runtime/compiler/BlockBuilder.ts -> runtime/behaviors/index.ts -> runtime/behaviors/WaitingToStartInjectorBehavior.ts',
  'runtime/behaviors/index.ts -> runtime/behaviors/ChildSelectionBehavior.ts -> runtime/actions/stack/PushRestBlockAction.ts -> runtime/blocks/RestBlock.ts',
  'runtime/behaviors/index.ts -> runtime/behaviors/WaitingToStartInjectorBehavior.ts -> runtime/blocks/WaitingToStartBlock.ts',
  'runtime/contracts/IRuntimeMemory.ts -> runtime/impl/TypedMemoryReference.ts',
  'runtime/contracts/IScriptRuntime.ts -> runtime/actions/ErrorAction.ts',
  'runtime/contracts/IScriptRuntime.ts -> runtime/contracts/IRuntimeOptions.ts -> runtime/contracts/ITestableBlockConfig.ts',
].sort();

const barrelRules = [
  {
    filePath: 'src/runtime/compiler/metrics/index.ts',
    allowedExports: [],
    description: 'Keep the metrics barrel empty so dead metric re-exports do not return.',
  },
  {
    filePath: 'src/runtime/events/index.ts',
    allowedExports: ['EventBus'],
    description: 'Keep the runtime events barrel limited to the EventBus entry point.',
  },
];

const liveImportRoots = ['src', 'tests', 'stories', 'e2e'];
const issues = [];

function relative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
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

function scanForRetiredRuntimeTestBenchImports() {
  const offenders = [];

  for (const root of liveImportRoots) {
    const absoluteRoot = path.join(repoRoot, root);
    if (!fs.existsSync(absoluteRoot)) {
      continue;
    }

    for (const filePath of walk(absoluteRoot)) {
      const source = fs.readFileSync(filePath, 'utf8');
      const repoRelativePath = relative(filePath);

      for (const match of source.matchAll(importPattern)) {
        const specifier = match[1] || match[2] || match[3];
        if (!specifier || !specifier.includes('runtime-test-bench')) {
          continue;
        }

        offenders.push(`${repoRelativePath} -> ${specifier}`);
      }
    }
  }

  return offenders.sort();
}

function parseNamedExports(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const exportNames = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('export')) {
      continue;
    }

    let match = line.match(/^export\s+\{\s*([^}]*)\s*\}\s+from\s+['"][^'"]+['"]/);
    if (match) {
      const names = match[1]
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => {
          const aliasParts = name.split(/\s+as\s+/i).map((part) => part.trim());
          return aliasParts[aliasParts.length - 1];
        });
      exportNames.push(...names);
      continue;
    }

    match = line.match(/^export\s+\*\s+as\s+(\w+)\s+from\s+['"][^'"]+['"]/);
    if (match) {
      exportNames.push(match[1]);
      continue;
    }

    if (/^export\s+\*\s+from\s+['"][^'"]+['"]/.test(line)) {
      exportNames.push('*');
      continue;
    }

    match = line.match(/^export\s+(?:async\s+)?(?:const|class|function|interface|type|enum)\s+(\w+)/);
    if (match) {
      exportNames.push(match[1]);
      continue;
    }

    match = line.match(/^export\s+default\s+(\w+)/);
    if (match) {
      exportNames.push(`default:${match[1]}`);
    }
  }

  return exportNames.sort();
}

function checkBarrels() {
  const barrelProblems = [];

  for (const rule of barrelRules) {
    const absolutePath = path.join(repoRoot, rule.filePath);
    const actualExports = parseNamedExports(absolutePath);
    const expectedExports = [...rule.allowedExports].sort();

    if (JSON.stringify(actualExports) !== JSON.stringify(expectedExports)) {
      barrelProblems.push({
        filePath: rule.filePath,
        expectedExports,
        actualExports,
        description: rule.description,
      });
    }
  }

  return barrelProblems;
}

function getCircularDependencySignatures() {
  const result = spawnSync(
    'bun',
    ['x', 'madge', '--extensions', 'ts,tsx', '--ts-config', 'tsconfig.json', '--circular', '--json', 'src/'],
    { cwd: repoRoot, encoding: 'utf8' },
  );

  if (result.error) {
    throw result.error;
  }

  if (![0, 1].includes(result.status)) {
    throw new Error(result.stderr || `madge exited with status ${result.status}`);
  }

  const stdout = result.stdout.trim();
  if (!stdout) {
    return [];
  }

  const cycles = JSON.parse(stdout);
  return cycles.map((cycle) => cycle.join(' -> ')).sort();
}

const retiredImportOffenders = scanForRetiredRuntimeTestBenchImports();
if (retiredImportOffenders.length > 0) {
  issues.push('Retired runtime-test-bench imports must stay out of live code:');
  for (const offender of retiredImportOffenders) {
    issues.push(`- ${offender}`);
  }
}

const barrelProblems = checkBarrels();
if (barrelProblems.length > 0) {
  issues.push('Protected barrels changed shape:');
  for (const problem of barrelProblems) {
    issues.push(`- ${problem.filePath}`);
    issues.push(`  - Expected exports: ${problem.expectedExports.length ? problem.expectedExports.join(', ') : '(none)'}`);
    issues.push(`  - Actual exports: ${problem.actualExports.length ? problem.actualExports.join(', ') : '(none)'}`);
    issues.push(`  - Why it matters: ${problem.description}`);
  }
}

let cycleSignatures = [];
try {
  cycleSignatures = getCircularDependencySignatures();
} catch (error) {
  issues.push(`Unable to run madge circular dependency check: ${error.message}`);
}

if (cycleSignatures.length > 0) {
  const unexpectedCycles = cycleSignatures.filter((signature) => !allowedCycleSignatures.includes(signature));
  if (unexpectedCycles.length > 0) {
    issues.push('New circular dependencies were introduced beyond the approved baseline:');
    for (const signature of unexpectedCycles) {
      issues.push(`- ${signature}`);
    }
  }
}

if (issues.length > 0) {
  console.error('Architecture regression checks failed.');
  for (const issue of issues) {
    console.error(issue);
  }
  process.exit(1);
}

const resolvedCycles = allowedCycleSignatures.filter((signature) => !cycleSignatures.includes(signature));
console.log('Architecture regression checks passed.');
console.log(`- Circular dependency baseline: ${cycleSignatures.length}/${allowedCycleSignatures.length} tracked cycles still present`);
console.log(`- Retired runtime-test-bench imports: none found across ${liveImportRoots.join(', ')}`);
console.log(`- Protected barrels: ${barrelRules.length} files unchanged`);
if (resolvedCycles.length > 0) {
  console.log(`- Improved cycles since baseline: ${resolvedCycles.length}`);
}
