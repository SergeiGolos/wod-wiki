#!/usr/bin/env node
// Rewrite ui's '@bitcobblers/wod-wiki-engine' imports into split-package imports.
const fs = require('fs');
const path = require('path');

const HOME = {
  // core
  MetricType: 'core', ICodeStatement: 'core', IMetric: 'core', ScriptBlock: 'core',
  Segment: 'core', StoredOutputStatement: 'core', BlockIndexRow: 'core',
  // lang
  createParser: 'lang', whiteboardScript: 'lang', whiteboardScriptLanguage: 'lang',
  getAnalyticsFromLogs: 'lang',
  // wql: everything else ui imports
  DashboardDocument: 'wql', DashboardToken: 'wql', DashboardWidget: 'wql',
  buildDashboardDocument: 'wql',
  ParsedFindQuery: 'wql', ParsedQuery: 'wql', ParsedRowsQuery: 'wql',
  QueryOptions: 'wql', QueryResult: 'wql', RowsQueryResult: 'wql', RowsRun: 'wql',
  Series: 'wql', WQL_AGGREGATORS: 'wql', WQL_CALC_TARGETS: 'wql',
  WQL_COMPARISON_OPS: 'wql', WQL_DISPLAY_UNITS: 'wql', WQL_INTENSITY_TIERS: 'wql',
  WQL_METRIC_AGGREGATES: 'wql', WQL_METRIC_FAMILIES: 'wql', WQL_ROLLUP_PERIODS: 'wql',
  WQL_SOURCES: 'wql', WQL_TAG_KEYS: 'wql', WQL_VIRTUAL_DIMS: 'wql',
  createParserUnused: 'wql', defaultTokenValues: 'wql', isDashboardWidgetType: 'wql',
  isFindQuery: 'wql', isRowsQuery: 'wql', parseQuery: 'wql', parseQueryWidgetSuffix: 'wql',
  parseWqlSuffixes: 'wql', resolveWidgetType: 'wql', splitAtWhere: 'wql',
  splitWidgetBody: 'wql', substituteTokens: 'wql', unknownTokensMessage: 'wql',
  unknownWidgetTypeMessage: 'wql', wql: 'wql', wqlLanguage: 'wql',
};

const root = 'packages/ui';
let changed = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) {
      let src = fs.readFileSync(p, 'utf8');
      const re = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+['"]@wod-wiki\/engine['"];?/g;
      let m;
      const edits = [];
      while ((m = re.exec(src))) {
        const isTypeImport = !!m[1];
        const syms = m[2].split(',').map((s) => s.replace(/\/\*.*?\*\//g, '').trim()).filter(Boolean);
        const byHome = { core: [], lang: [], wql: [] };
        for (let s of syms) {
          const wasType = /^type\s+/.test(s);
          s = s.replace(/^type\s+/, '').trim();
          const home = HOME[s];
          if (!home) throw new Error(`Unknown symbol ${s} in ${p}`);
          byHome[home].push((wasType && !isTypeImport ? 'type ' : '') + s);
        }
        const stmts = [];
        for (const home of ['core', 'lang', 'wql']) {
          if (byHome[home].length === 0) continue;
          stmts.push(`import${isTypeImport ? ' type' : ''} { ${byHome[home].join(', ')} } from '@wod-wiki/${home}';`);
        }
        edits.push([m.index, m.index + m[0].length, stmts.join('\n')]);
      }
      if (edits.length) {
        for (let i = edits.length - 1; i >= 0; i--) {
          src = src.slice(0, edits[i][0]) + edits[i][2] + src.slice(edits[i][1]);
        }
        fs.writeFileSync(p, src);
        changed++;
      }
    }
  }
};
walk(path.join(root, 'src'));
walk(path.join(root, 'test'));
console.log('rewrote', changed, 'files');
