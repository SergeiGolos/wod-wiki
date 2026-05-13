/**
 * Architecture Regression Tests
 *
 * Structural tests that enforce architectural boundaries and prevent regressions
 * after the improvements made in WOD-225 (reduce components fan-out) and
 * WOD-226 (consolidate duplicate types).
 *
 * These tests run as part of the standard unit test suite (`bun run test`).
 * For deeper checks (circular dependencies via madge, unused exports via ts-prune),
 * use: `bun run check:architecture`
 *
 * @see WOD-223 - Add architecture regression checks to the repo
 * @see WOD-225 - Reduce components layer fan-out
 * @see WOD-226 - Consolidate duplicate types between core and runtime contracts
 */

import { describe, it, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(import.meta.dir, '..', '..', '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const skipDirs = new Set([
  '.git', 'coverage', 'dist', 'node_modules', 'playwright-report',
  'storybook-static', 'test-results', '_archive',
]);
const scanExtensions = new Set(['.ts', '.tsx']);
const importPattern = /(?:import|export)\s+(?:type\s+)?[^'"\n]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function* walkDir(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(abs);
    } else if (entry.isFile() && scanExtensions.has(path.extname(entry.name))) {
      yield abs;
    }
  }
}

function getImportsFrom(filePath: string): string[] {
  const src = fs.readFileSync(filePath, 'utf8');
  const imports: string[] = [];
  for (const m of src.matchAll(importPattern)) {
    const specifier = m[1] || m[2] || m[3];
    if (specifier) imports.push(specifier);
  }
  return imports;
}

function relative(filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function parseNamedExports(filePath: string): string[] {
  const source = fs.readFileSync(filePath, 'utf8');
  const exportNames: string[] = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('export')) continue;

    let match = line.match(/^export\s+\{\s*([^}]*)\s*\}\s+from\s+['"][^'"]+['"]/);
    if (match) {
      exportNames.push(
        ...match[1].split(',').map(n => n.trim()).filter(Boolean).map(n => {
          const parts = n.split(/\s+as\s+/i).map(p => p.trim());
          return parts[parts.length - 1];
        })
      );
      continue;
    }
    match = line.match(/^export\s+\*\s+as\s+(\w+)\s+from\s+['"][^'"]+['"]/);
    if (match) { exportNames.push(match[1]); continue; }
    if (/^export\s+\*\s+from\s+['"][^'"]+['"]/.test(line)) { exportNames.push('*'); continue; }
    match = line.match(/^export\s+(?:async\s+)?(?:const|class|function|interface|type|enum)\s+(\w+)/);
    if (match) { exportNames.push(match[1]); continue; }
    match = line.match(/^export\s+default\s+(\w+)/);
    if (match) { exportNames.push(`default:${match[1]}`); }
  }
  return exportNames.sort();
}

// ---------------------------------------------------------------------------
// 1. Retired import guard — runtime-test-bench must stay out of live code
// ---------------------------------------------------------------------------

describe('Architecture: Retired imports', () => {
  const liveImportRoots = ['src', 'tests', 'stories', 'e2e'];

  it('should not import from retired runtime-test-bench module', () => {
    const offenders: string[] = [];
    for (const root of liveImportRoots) {
      const absRoot = path.join(repoRoot, root);
      if (!fs.existsSync(absRoot)) continue;
      for (const filePath of walkDir(absRoot)) {
        for (const specifier of getImportsFrom(filePath)) {
          if (specifier.includes('runtime-test-bench')) {
            offenders.push(`${relative(filePath)} -> ${specifier}`);
          }
        }
      }
    }
    expect(
      offenders,
      `Found imports from retired runtime-test-bench:\n${offenders.join('\n')}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Cross-layer import guard — components must not import runtime/* directly
//    (post WOD-225: components access runtime through facades/context only)
// ---------------------------------------------------------------------------

describe('Architecture: Components layer boundary (WOD-225)', () => {
  const componentsDir = path.join(repoRoot, 'src', 'components');

  // Imports via @/runtime/* or relative ../../runtime/* are forbidden.
  // Exceptions:
  //  - Files in _archive/ (legacy code, not shipping)
  //  - Test files (.test.ts, .spec.ts)
  //  - Comment-only references (handled by regex matching actual imports)
  const FORBIDDEN_RUNTIME_PATTERNS = [
    /^@\/runtime\//,
    // Relative imports resolving to src/runtime/ (not src/views/runtime/)
    // Matches ../../runtime/foo but NOT ../../views/runtime/foo
    /^(?:\.\.\/)+runtime\//
  ];

  it('should not import from runtime/* directly in component files', () => {
    const offenders: string[] = [];
    for (const filePath of walkDir(componentsDir)) {
      const rel = relative(filePath);
      // Skip test files and archived code
      if (rel.includes('.test.') || rel.includes('.spec.') || rel.includes('/_archive/')) continue;

      for (const specifier of getImportsFrom(filePath)) {
        if (FORBIDDEN_RUNTIME_PATTERNS.some(p => p.test(specifier))) {
          offenders.push(`${rel} imports ${specifier}`);
        }
      }
    }
    expect(
      offenders,
      `Components should not import runtime/* directly (use facades/context):\n${offenders.join('\n')}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Protected barrel shapes
//    These barrels were intentionally locked down — any export additions must
//    be deliberate, not accidental re-export sprawl.
// ---------------------------------------------------------------------------

describe('Architecture: Protected barrel files', () => {
  const barrelRules: Array<{ filePath: string; allowedExports: string[]; description: string }> = [
    {
      filePath: 'src/runtime/compiler/metrics/index.ts',
      allowedExports: [],
      description: 'Keep the metrics barrel empty — metric classes are imported directly from their source files.',
    },
    {
      filePath: 'src/runtime/events/index.ts',
      allowedExports: ['EventBus'],
      description: 'Keep the runtime events barrel limited to EventBus — other event types are imported directly.',
    },
  ];

  for (const rule of barrelRules) {
    it(`barrel ${rule.filePath} should export only: [${rule.allowedExports.join(', ') || '(none)'}]`, () => {
      const absolutePath = path.join(repoRoot, rule.filePath);
      const actualExports = parseNamedExports(absolutePath);
      const expectedExports = [...rule.allowedExports].sort();

      expect(
        actualExports,
        `${rule.filePath} barrel shape changed.\n` +
        `Expected: [${expectedExports.join(', ') || 'none'}]\n` +
        `Actual: [${actualExports.join(', ') || 'none'}]\n` +
        `Why: ${rule.description}`
      ).toEqual(expectedExports);
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Core/runtime type consolidation guard (WOD-226)
//    Verify that the consolidated type locations exist and are the canonical
//    source, and that no duplicate re-export of core types lives in runtime.
// ---------------------------------------------------------------------------

describe('Architecture: Type consolidation boundary (WOD-226)', () => {
  it('should have canonical core contracts in src/core/contracts/', () => {
    const contractsDir = path.join(repoRoot, 'src', 'core', 'contracts');
    expect(
      fs.existsSync(contractsDir),
      'src/core/contracts/ directory must exist as canonical type location'
    ).toBe(true);

    const files = fs.readdirSync(contractsDir).filter(f => f.endsWith('.ts'));
    expect(
      files.length,
      'src/core/contracts/ should have at least one contract file'
    ).toBeGreaterThan(0);
  });

  it('should have IMetricContainer in core contracts (canonical location)', () => {
    const metricContainerPath = path.join(repoRoot, 'src', 'core', 'contracts', 'IMetricContainer.ts');
    expect(
      fs.existsSync(metricContainerPath),
      'IMetricContainer should live in src/core/contracts/ as the canonical source'
    ).toBe(true);
  });

  it('should have IMetricSource in core contracts (canonical location)', () => {
    const metricSourcePath = path.join(repoRoot, 'src', 'core', 'contracts', 'IMetricSource.ts');
    expect(
      fs.existsSync(metricSourcePath),
      'IMetricSource should live in src/core/contracts/ as the canonical source'
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. No duplicate type definitions for key shared interfaces
//    If the same interface name appears in both core/* and runtime/contracts/*,
//    that is a consolidation regression.
// ---------------------------------------------------------------------------

describe('Architecture: No duplicate type definitions across core and runtime', () => {
  const MONITORED_TYPES = [
    'IMetricContainer',
    'IMetricSource',
    'IAnalyticsEngine',
  ];

  for (const typeName of MONITORED_TYPES) {
    it(`${typeName} should be defined in only one layer`, () => {
      const occurrences: string[] = [];
      for (const layer of ['core', 'runtime']) {
        const layerDir = path.join(repoRoot, 'src', layer);
        if (!fs.existsSync(layerDir)) continue;
        for (const filePath of walkDir(layerDir)) {
          const src = fs.readFileSync(filePath, 'utf8');
          // Match interface or type declarations (not just references)
          const declarationPattern = new RegExp(
            `^\\s*export\\s+(?:interface|type)\\s+${typeName}\\b`,
            'gm'
          );
          if (declarationPattern.test(src)) {
            occurrences.push(relative(filePath));
          }
        }
      }
      expect(
        occurrences.length,
        `${typeName} is declared in multiple files: ${occurrences.join(', ')}\n` +
        `It should live in exactly one canonical location (expected: src/core/contracts/).`
      ).toBeLessThanOrEqual(1);
    });
  }
});
