#!/usr/bin/env node
/**
 * omf — oh-my-frontmatter. Inventory and prune YAML frontmatter across the
 * seed markdown corpus (default: markdown/).
 *
 *   omf ls [--dir D]                   all properties: per-value file counts
 *   omf crosswalk [--dir D]            dir × property matrix (cells = file counts)
 *   omf read p1 [p2 ...] [--dir D]     values grouped by property (value -> files)
 *   omf delete PROP [--dir D] [--dry]  remove PROP from every file that has it
 *   omf merge TARGET SRC... [--dry]    move SRC values into TARGET, drop SRC tags
 *
 * Merge rules: if TARGET or any SRC is a list, result is the deduped union
 * (TARGET values first, then SRCs in argument order); otherwise first source
 * wins and an existing TARGET wins — discards are warned. TARGET is created
 * on pages that lack it, at the first removed tag's position.
 * Only `key: value` scalars and `key:` + `- item` lists are rewritten;
 * files with any other frontmatter shape are skipped with a warning.
 *
 * ponytail: single-level YAML only — no nested maps/flow lists. Add a real
 * YAML dep if seed frontmatter ever needs them.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import assert from 'node:assert';

// ── frontmatter model: ordered list of { key, value: string | string[] } ──

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return null;
  const end = raw.indexOf('\n---', 4);
  if (end === -1) return null;
  const body = raw.slice(4, end);
  const rest = raw.slice(end + 4); // keeps the newline after closing ---
  const entries = [];
  let current = null;
  for (const line of body.split('\n')) {
    const kv = /^([A-Za-z0-9_-]+):(.*)$/.exec(line);
    if (kv) {
      current = { key: kv[1], value: kv[2].trim() === '' ? [] : kv[2].trim() };
      entries.push(current);
    } else if (current && Array.isArray(current.value) && /^\s*-\s+/.test(line)) {
      current.value.push(/^\s*-\s+(.*)$/.exec(line)[1].trim());
    } else if (line.trim() === '') {
      continue;
    } else {
      return { error: `unrecognized line: ${JSON.stringify(line)}` };
    }
  }
  return { entries, rest };
}

function serializeFrontmatter(entries, rest) {
  const lines = entries.flatMap(({ key, value }) =>
    Array.isArray(value)
      ? value.length === 0
        ? [`${key}:`]
        : [key + ':', ...value.map((v) => `  - ${v}`)]
      : [`${key}: ${value}`],
  );
  return `---\n${lines.join('\n')}\n---${rest}`;
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith('.md') ? [path] : [];
  });
}

function loadPages(dir) {
  const pages = [];
  const skipped = [];
  for (const path of walk(dir)) {
    const raw = readFileSync(path, 'utf8');
    const fm = parseFrontmatter(raw);
    if (!fm || fm.error) { skipped.push(fm ? `${path} (${fm.error})` : path); continue; }
    pages.push({ path, rel: relative(dir, path), entries: fm.entries, rest: fm.rest, raw });
  }
  return { pages, skipped };
}

const get = (entries, key) => entries.find((e) => e.key === key)?.value;
const fmtValue = (v) => (Array.isArray(v) ? `[${v.join(', ')}]` : String(v));

function reportSkipped(skipped) {
  for (const s of skipped) console.error(`skipped: ${s}`);
}

// ── subcommands ────────────────────────────────────────────────────────────

function crosswalkStats(pages) {
  const dirs = new Map(); // dir -> { files, props: Map(prop -> file count) }
  for (const page of pages) {
    const dir = page.rel.includes('/') ? page.rel.split('/')[0] : '(root)';
    if (!dirs.has(dir)) dirs.set(dir, { files: 0, props: new Map() });
    const d = dirs.get(dir);
    d.files++;
    for (const { key } of page.entries) d.props.set(key, (d.props.get(key) ?? 0) + 1);
  }
  const total = (p) => [...dirs.values()].reduce((n, d) => n + (d.props.get(p) ?? 0), 0);
  const props = [...new Set([...dirs.values()].flatMap((d) => [...d.props.keys()]))]
    .sort((a, b) => total(b) - total(a));
  return { dirs, props };
}

function cmdCrosswalk(dir) {
  const { pages, skipped } = loadPages(dir);
  const { dirs, props } = crosswalkStats(pages);
  const header = ['directory', 'files', ...props];
  console.log('| ' + header.join(' | ') + ' |');
  console.log('|' + header.map(() => ' --- ').join('|') + '|');
  for (const [name, d] of [...dirs.entries()].sort()) {
    console.log(`| ${name} | ${d.files} | ${props.map((p) => d.props.get(p) ?? '·').join(' | ')} |`);
  }
  reportSkipped(skipped);
}

function cmdLs(dir) {
  const { pages, skipped } = loadPages(dir);
  const stats = new Map();
  for (const page of pages) {
    for (const { key, value } of page.entries) {
      if (!stats.has(key)) stats.set(key, { files: 0, values: new Map() });
      const s = stats.get(key);
      s.files++;
      const v = fmtValue(value);
      s.values.set(v, (s.values.get(v) ?? 0) + 1);
    }
  }
  for (const key of [...stats.keys()].sort()) {
    const s = stats.get(key);
    console.log(`${key}  files=${s.files} values=${s.values.size}`);
    for (const [v, n] of [...s.values.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${n}× ${v}`);
    }
  }
  reportSkipped(skipped);
}

function cmdRead(dir, props) {
  const { pages, skipped } = loadPages(dir);
  for (const prop of props) {
    const byValue = new Map();
    let files = 0;
    for (const page of pages) {
      const v = get(page.entries, prop);
      if (v === undefined) continue;
      files++;
      const label = fmtValue(v);
      if (!byValue.has(label)) byValue.set(label, []);
      byValue.get(label).push(page.rel);
    }
    console.log(`${prop}  (${files} files)`);
    for (const [v, owners] of [...byValue.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${v} — ${owners.length} files`);
      for (const o of owners) console.log(`      ${o}`);
    }
  }
  reportSkipped(skipped);
}

function mutate(pages, dry, fn) {
  const warnings = [];
  let changed = 0;
  for (const page of pages) {
    const next = fn(page, warnings);
    if (!next) continue;
    const serialized = serializeFrontmatter(next, page.rest);
    if (serialized === page.raw) continue;
    changed++;
    if (!dry) writeFileSync(page.path, serialized, 'utf8');
  }
  return { changed, warnings };
}

const dropWarn = (page, key, sv, target, value, warnings) => {
  if (sv !== null && sv !== value) warnings.push(`${page.rel}: dropping ${key}: ${sv} (keeping ${target}: ${value})`);
};

function cmdDelete(dir, prop, dry) {
  const { pages } = loadPages(dir);
  const { changed } = mutate(pages, dry, (page) =>
    get(page.entries, prop) === undefined ? null : page.entries.filter((e) => e.key !== prop),
  );
  console.log(`${dry ? 'would remove' : 'removed'} ${prop} from ${changed} files`);
}

function cmdMerge(dir, target, sources, dry) {
  const { pages } = loadPages(dir);
  const { changed, warnings } = mutate(pages, dry, (page, warns) => {
    const srcEntries = sources.map((s) => page.entries.find((e) => e.key === s)).filter(Boolean);
    if (srcEntries.length === 0) return null;
    const targetEntry = page.entries.find((e) => e.key === target);
    const anyList =
      (targetEntry && Array.isArray(targetEntry.value)) || srcEntries.some((e) => Array.isArray(e.value));

    let value;
    if (anyList) {
      value = [];
      const push = (v) => { if (!value.includes(v)) value.push(v); };
      if (targetEntry) (Array.isArray(targetEntry.value) ? targetEntry.value : [targetEntry.value]).forEach(push);
      for (const src of srcEntries) (Array.isArray(src.value) ? src.value : [src.value]).forEach(push);
    } else {
      const winner = targetEntry ?? srcEntries[0];
      value = winner.value;
      for (const src of srcEntries) if (src !== winner) dropWarn(page, src.key, src.value, target, value, warns);
    }

    // rebuild: TARGET (or first removed SRC) keeps its slot, sources drop out
    const out = [];
    let inserted = false;
    for (const e of page.entries) {
      if (e.key === target || sources.includes(e.key)) {
        if (!inserted) { out.push({ key: target, value }); inserted = true; }
        continue;
      }
      out.push(e);
    }
    return out;
  });
  for (const w of warnings) console.error(`warn: ${w}`);
  console.log(`${dry ? 'would merge' : 'merged'} ${sources.join(', ')} -> ${target} in ${changed} files`);
}

// ── selftest ───────────────────────────────────────────────────────────────

function selftest() {
  const tmp = mkdtempSync(join(tmpdir(), 'omf-'));
  const write = (name, text) => writeFileSync(join(tmp, name), text, 'utf8');
  const load = (name) => parseFrontmatter(readFileSync(join(tmp, name), 'utf8'));
  write('a.md', '---\nformat: for-max-weight\ndomain: crossfit\ntitle: "A"\n---\n# A\n');
  write('b.md', '---\nformat: max-weight\ncategory:\n  - crossfit\n  - heavy\n---\n# B\n');
  write('c.md', '---\ndomain: kettlebell\n---\n# C\n');
  write('d.md', '---\nfor-max-weight: legacy\nlayout: post\n---\n# D\n');
  write('plain.md', '# no frontmatter\n');

  const cw = crosswalkStats(loadPages(tmp).pages);
  assert.equal(cw.dirs.get('(root)').files, 4); // plain.md skipped
  assert.ok(cw.props.includes('format') && cw.props.includes('category'));

  cmdMerge(tmp, 'format', ['for-max_weight', 'max_weight'], true); // dry: no-op
  assert.equal(load('a.md').entries.length, 3); // format, domain, title — dry merge touched nothing
  cmdMerge(tmp, 'format', ['for-max-weight', 'max-weight'], false);
  assert.equal(get(load('a.md').entries, 'format'), 'for-max-weight'); // already canonical, untouched
  assert.equal(get(load('d.md').entries, 'format'), 'legacy'); // key renamed into target
  assert.equal(get(load('d.md').entries, 'layout'), 'post'); // neighbors untouched
  assert.ok(load('d.md').entries.every((e) => e.key !== 'for-max-weight'));
  assert.equal(get(load('b.md').entries, 'format'), 'max-weight');

  cmdMerge(tmp, 'tags', ['category'], false); // list rename
  assert.deepEqual(get(load('b.md').entries, 'tags'), ['crossfit', 'heavy']);
  assert.equal(get(load('b.md').entries, 'category'), undefined);

  cmdMerge(tmp, 'domain', ['tags'], false); // list -> existing scalar becomes union
  assert.deepEqual(get(load('b.md').entries, 'domain'), ['crossfit', 'heavy']);
  assert.equal(get(load('b.md').entries, 'tags'), undefined);

  cmdDelete(tmp, 'domain', false);
  assert.ok(load('c.md').entries.every((e) => e.key !== 'domain'));
  assert.equal(load('c.md').rest, '\n# C\n'); // body preserved verbatim

  const a = load('a.md');
  assert.equal(serializeFrontmatter(a.entries, a.rest), readFileSync(join(tmp, 'a.md'), 'utf8'));
  rmSync(tmp, { recursive: true, force: true });
  console.log('selftest: OK');
}

// ── entry ──────────────────────────────────────────────────────────────────

function main(argv) {
  const args = [];
  let dir = 'markdown';
  let dry = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry') dry = true;
    else if (argv[i] === '--dir') dir = argv[++i];
    else args.push(argv[i]);
  }
  const [cmd, ...rest] = args;
  if (cmd === 'ls') return cmdLs(dir);
  if (cmd === 'crosswalk') return cmdCrosswalk(dir);
  if (cmd === 'read' && rest.length) return cmdRead(dir, rest);
  if (cmd === 'delete' && rest.length === 1) return cmdDelete(dir, rest[0], dry);
  if (cmd === 'merge' && rest.length >= 2) return cmdMerge(dir, rest[0], rest.slice(1), dry);
  if (cmd === 'selftest') return selftest();
  console.error('usage: omf ls | crosswalk | read PROP... | delete PROP | merge TARGET SRC...  [--dir D] [--dry]');
  process.exit(2);
}

main(process.argv.slice(2));
