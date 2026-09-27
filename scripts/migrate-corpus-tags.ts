import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Tag classifications ───────────────────────────────────────────────────

const TAG_TO_TYPED: Record<string, { type: 'domain' | 'equipment' | 'quality' | 'intent'; value: string }> = {
  // Domain
  parkour: { type: 'domain', value: 'parkour' },
  crossfit: { type: 'domain', value: 'crossfit' },
  swimming: { type: 'domain', value: 'swimming' },
  triathlon: { type: 'domain', value: 'triathlon' },
  climbing: { type: 'domain', value: 'climbing' },

  // Equipment
  kettlebell: { type: 'equipment', value: 'kettlebell' },
  clubs: { type: 'equipment', value: 'clubs' },
  barbell: { type: 'equipment', value: 'barbell' },
  unconventional: { type: 'equipment', value: 'unconventional' },
  minimalist: { type: 'equipment', value: 'minimalist' },

  // Quality
  strength: { type: 'quality', value: 'strength' },
  endurance: { type: 'quality', value: 'endurance' },
  conditioning: { type: 'quality', value: 'conditioning' },
  cardio: { type: 'quality', value: 'conditioning' }, // merge cardio into conditioning
  recovery: { type: 'quality', value: 'recovery' },

  // Intent
  competition: { type: 'intent', value: 'competition' },
  benchmark: { type: 'intent', value: 'benchmark' },
  sport: { type: 'intent', value: 'sport' },
};

// ── Normalization for workout `type:` and `format:` ───────────────────────

interface DecomposedType {
  format?: string;
  quality?: string[];
  equipment?: string[];
  intent?: string;
  domain?: string;
}

const TYPE_MAP: Record<string, DecomposedType> = {
  // Base 6 + variants
  'for time': { format: 'for-time' },
  'for time / volume training': { format: 'for-time', quality: ['strength'] },
  'for time (with time standards)': { format: 'for-time' },
  intervals: { format: 'intervals' },
  'distance intervals': { format: 'intervals' },
  emom: { format: 'emom' },
  'emom (every minute on the minute)': { format: 'emom' },
  'emom strength': { format: 'emom', quality: ['strength'] },
  'emom / strength-endurance': { format: 'emom', quality: ['strength', 'endurance'] },
  amrap: { format: 'amrap' },
  'amrap (as many rounds as possible)': { format: 'amrap' },
  'amrap strength': { format: 'amrap', quality: ['strength'] },
  skill: { format: 'skill' },
  'technique focus': { format: 'skill' },
  'skill development': { format: 'skill' },
  'max weight': { format: 'max-weight' },
  'max reps': { format: 'max-reps' },
  'max reps endurance test': { format: 'max-reps', quality: ['endurance'] },

  // Complexes & Circuits
  'strength complex': { format: 'complex', quality: ['strength'] },
  'progressive strength complex': { format: 'complex', quality: ['strength'] },
  'advanced complex': { format: 'complex', quality: ['strength'] },
  'strength/mobility complex': { format: 'complex', quality: ['strength', 'recovery'] },
  'complex for fat loss': { format: 'complex', quality: ['conditioning'] },
  'double kettlebell circuit': { format: 'circuit', equipment: ['kettlebell'], quality: ['conditioning'] },
  'high-intensity circuit': { format: 'circuit', quality: ['conditioning'] },
  'high-intensity finisher': { format: 'finisher', quality: ['conditioning'] },
  'high-intensity lower body': { format: 'intervals', quality: ['strength', 'conditioning'] },

  // Strength
  'progressive strength': { quality: ['strength'] },
  'strength development': { quality: ['strength'] },
  'strength / compound movement': { quality: ['strength'] },
  'high-frequency strength / skill work': { format: 'skill', quality: ['strength'] },
  'high volume strength': { quality: ['strength'] },
  'full body strength': { quality: ['strength'] },
  'sport-specific strength': { quality: ['strength'] },
  'full body hypertrophy': { quality: ['strength'] },
  'progressive hypertrophy': { quality: ['strength'] },
  'maintenance / easy strength': { quality: ['strength'] },
  'strength endurance challenge': { quality: ['strength', 'endurance'] },
  'upper body strength endurance': { quality: ['strength', 'endurance'] },
  'odd-object strength / loaded carries': { quality: ['strength'], equipment: ['unconventional'] },
  'rotational strength / flow work': { quality: ['strength'], equipment: ['clubs'] },
  'ballistic strength / power-endurance': { quality: ['strength', 'power'] },
  'ballistic / flow movement': { quality: ['strength', 'power'] },
  'ballistic / rotational movement': { quality: ['strength', 'power'] },
  'high volume swing': { quality: ['strength', 'conditioning'], equipment: ['kettlebell'] },

  // Endurance & Power
  'aerobic endurance': { quality: ['endurance'] },
  'endurance': { quality: ['endurance'] },
  'elite endurance': { quality: ['endurance'] },
  'sport-specific endurance': { quality: ['endurance'] },
  'snatch-specific endurance': { quality: ['endurance'], equipment: ['kettlebell'] },
  'long distance': { quality: ['endurance'] },
  'ultra-endurance': { quality: ['endurance'] },
  'elite distance': { quality: ['endurance'] },
  'power endurance / progressive emom': { format: 'emom', quality: ['power', 'endurance'] },
  'maximum power': { quality: ['power'] },
  'maximum velocity': { quality: ['power'] },
  'speed development': { quality: ['power'] },
  'speed/power': { quality: ['power'] },
  'anaerobic power': { quality: ['power'] },

  // Competition & Benchmark
  'competition event': { intent: 'competition' },
  'competition preparation': { intent: 'competition' },
  'competition peak': { intent: 'competition' },
  'competition sharpening': { intent: 'competition' },
  'fitness benchmark': { intent: 'benchmark' },
  'team event': { intent: 'competition' },

  // Swimming
  'individual medley': { domain: 'swimming', format: 'individual-medley' },
  'elite individual medley': { domain: 'swimming', format: 'individual-medley' },
  'open water training': { domain: 'swimming', quality: ['endurance'] },
  'elite multi-stroke': { domain: 'swimming' },

  // General / intro
  'mobility and recovery': { quality: ['recovery'] },
  'progressive conditioning': { quality: ['conditioning'] },
  'balanced fitness': { quality: ['conditioning'] },
  'balanced programming system': { quality: ['conditioning'] },
  'minimalist training': { equipment: ['minimalist'] },
  'foundation building': { quality: ['strength', 'conditioning'] },
  'comprehensive 6-day introduction': { format: 'program' },
  'comprehensive training block': { format: 'program' },
  'progressive introduction': { format: 'program' },
  'jerk-specific development': { format: 'skill', equipment: ['kettlebell'] },
  'long cycle development': { format: 'skill', equipment: ['kettlebell'] },
  'race preparation': { intent: 'competition' },
  'race-specific': { intent: 'competition' },
};

function normalizeType(rawType: string): DecomposedType {
  const key = rawType.toLowerCase().trim();
  if (TYPE_MAP[key]) return TYPE_MAP[key];

  // Fallback: derive slug
  const slug = key
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return { format: slug || undefined };
}

// ── Migration processor ───────────────────────────────────────────────────

export interface MigrateFileResult {
  path: string;
  changed: boolean;
  before: string;
  after: string;
}

export function migrateFrontmatter(relPath: string, content: string): { changed: boolean; newContent: string } {
  // Canvas files (except collection READMEs): do not touch their `type:`!
  const isCanvasPage = relPath.startsWith('markdown/canvas/') && !relPath.includes('sample-script.md');
  const isEffort = relPath.startsWith('markdown/efforts/');

  // Efforts have specialized schema (baseAttributes, aliases, etc.) — leave intact
  if (isEffort) {
    return { changed: false, newContent: content };
  }

  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!fmMatch) return { changed: false, newContent: content };

  const rawFm = fmMatch[1];
  const body = content.slice(fmMatch[0].length);

  // Parse lines of frontmatter
  const lines = rawFm.split(/\r?\n/);
  const outLines: string[] = [];
  
  // Extracted buckets
  const domains = new Set<string>();
  const formats = new Set<string>();
  const equipments = new Set<string>();
  const qualities = new Set<string>();
  const intents = new Set<string>();
  const generalTags = new Set<string>();

  let inTags = false;
  let inCategory = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check tags:
    if (/^tags:\s*$/.test(line)) {
      inTags = true;
      inCategory = false;
      continue;
    }
    // Check category:
    if (/^category:\s*$/.test(line)) {
      inCategory = true;
      inTags = false;
      continue;
    }

    if (inTags || inCategory) {
      const itemMatch = /^\s*-\s*(.+)$/.exec(line);
      if (itemMatch) {
        const val = itemMatch[1].trim();
        const mapped = TAG_TO_TYPED[val.toLowerCase()];
        if (mapped) {
          if (mapped.type === 'domain') domains.add(mapped.value);
          else if (mapped.type === 'equipment') equipments.add(mapped.value);
          else if (mapped.type === 'quality') qualities.add(mapped.value);
          else if (mapped.type === 'intent') intents.add(mapped.value);
        } else if (val === 'dashboard') {
          // drop dashboard tag
        } else {
          generalTags.add(val);
        }
        continue;
      } else if (/^[a-zA-Z0-9_-]+:/.test(line)) {
        inTags = false;
        inCategory = false;
      } else {
        continue;
      }
    }

    // Inline tags: [a, b]
    const inlineTags = /^tags:\s*\[(.*)\]/.exec(line);
    if (inlineTags) {
      for (const item of inlineTags[1].split(',')) {
        const val = item.trim();
        if (!val) continue;
        const mapped = TAG_TO_TYPED[val.toLowerCase()];
        if (mapped) {
          if (mapped.type === 'domain') domains.add(mapped.value);
          else if (mapped.type === 'equipment') equipments.add(mapped.value);
          else if (mapped.type === 'quality') qualities.add(mapped.value);
          else if (mapped.type === 'intent') intents.add(mapped.value);
        } else if (val !== 'dashboard') {
          generalTags.add(val);
        }
      }
      continue;
    }

    // Scalar category: e.g. "category: The Golos Method"
    const scalarCategory = /^category:\s*(.+)$/.exec(line);
    if (scalarCategory) {
      // For READMEs or collection files, scalar category is redundant with collection/domain. Drop it.
      continue;
    }

    // Difficulty: drop it
    if (/^difficulty:\s*/.test(line)) {
      continue;
    }

    // Type field in workout files (not canvas)
    if (!isCanvasPage && /^type:\s*(.+)$/.test(line)) {
      const rawType = /^type:\s*(.+)$/.exec(line)![1].trim();
      const decomposed = normalizeType(rawType);
      if (decomposed.format) formats.add(decomposed.format);
      if (decomposed.domain) domains.add(decomposed.domain);
      if (decomposed.intent) intents.add(decomposed.intent);
      if (decomposed.quality) decomposed.quality.forEach((q) => qualities.add(q));
      if (decomposed.equipment) decomposed.equipment.forEach((e) => equipments.add(e));
      continue;
    }

    // Existing format field in workout files
    if (!isCanvasPage && /^format:\s*(.+)$/.test(line)) {
      const rawFormat = /^format:\s*(.+)$/.exec(line)![1].trim();
      const decomposed = normalizeType(rawFormat);
      if (decomposed.format) formats.add(decomposed.format);
      continue;
    }

    outLines.push(line);
  }

  // Derive domain from path if still empty (for collections and feeds)
  if (domains.size === 0) {
    if (relPath.includes('zombiefit') || relPath.includes('ZombieFit')) {
      domains.add('parkour');
    } else if (relPath.includes('crossfit')) {
      domains.add('crossfit');
    } else if (relPath.includes('swimming')) {
      domains.add('swimming');
    } else if (relPath.includes('girevoy-sport')) {
      domains.add('girevoy-sport');
      equipments.add('kettlebell');
    }
  }

  // Construct new frontmatter lines
  // Standard order:
  // 1. Structural / page keys (template, collection, feed, dashboard, title, slug, route, etc.)
  // 2. Classification keys (domain, format, equipment, quality, intent, tags)
  // 3. Provenance & metadata (date, original_url, wayback_url, etc.)

  const newFmLines: string[] = [];

  // Retain non-tag headers
  const classificationKeys = new Set(['domain', 'format', 'equipment', 'quality', 'intent', 'tags']);
  for (const line of outLines) {
    const k = /^([a-zA-Z0-9_-]+):/.exec(line)?.[1];
    if (k && classificationKeys.has(k)) continue;
    // Don't emit empty lines if they were leftovers
    if (line.trim() === '' && newFmLines.length === 0) continue;
    newFmLines.push(line);
  }

  // Helper to append list or scalar
  const appendTyped = (key: string, values: Set<string>) => {
    if (values.size === 0) return;
    const sorted = [...values].sort();
    if (sorted.length === 1 && (key === 'domain' || key === 'format' || key === 'intent')) {
      newFmLines.push(`${key}: ${sorted[0]}`);
    } else {
      newFmLines.push(`${key}:`);
      for (const v of sorted) {
        newFmLines.push(`  - ${v}`);
      }
    }
  };

  appendTyped('domain', domains);
  appendTyped('format', formats);
  appendTyped('equipment', equipments);
  appendTyped('quality', qualities);
  appendTyped('intent', intents);
  appendTyped('tags', generalTags);

  // Clean trailing blank lines inside frontmatter
  while (newFmLines.length > 0 && newFmLines[newFmLines.length - 1].trim() === '') {
    newFmLines.pop();
  }

  const newContent = `---\n${newFmLines.join('\n')}\n---${body}`;
  const changed = newContent !== content;
  return { changed, newContent };
}

// ── CLI ───────────────────────────────────────────────────────────────────

async function main() {
  const isApply = process.argv.includes('--apply');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  let scanned = 0;
  let changedCount = 0;

  function scanDir(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        files.push(...scanDir(full));
      } else if (entry.endsWith('.md')) {
        files.push(full);
      }
    }
    return files;
  }

  const allMdFiles = scanDir(join(root, 'markdown'));
  for (const fullPath of allMdFiles) {
    scanned++;
    const rel = relative(root, fullPath).replace(/\\/g, '/');
    const content = readFileSync(fullPath, 'utf8');
    const { changed, newContent } = migrateFrontmatter(rel, content);
    if (changed) {
      changedCount++;
      if (isApply) {
        writeFileSync(fullPath, newContent, 'utf8');
      }
    }
  }

  console.log(`Scanned ${scanned} files. ${changedCount} file(s) ${isApply ? 'updated' : 'would change'}.`);
  if (!isApply && changedCount > 0) {
    console.log('Run with --apply to write changes.');
  }
}

if (import.meta.main) {
  main();
}
