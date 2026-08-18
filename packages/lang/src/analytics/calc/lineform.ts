/**
 * Lossless line-form compiler for the composed calculations layer (spec §2).
 *
 * Round-trips between the author-facing line syntax and canonical DAG
 * records (`CalculationDefinition`, spec §2.2). The line syntax is a superset
 * of `parseCalcLine`: it adds scope headers, `(library)` markers, `key`,
 * `grouped`, `label`, `emit`, `meta` output clauses, `|` variant sugar (with
 * optional `estimated` origin and per-variant `when`), and `where`
 * intermediate bindings.
 *
 * Guarantees (verified by tests):
 *   - `compile(print(def))` deep-equals `def` for any def this module emits.
 *   - Output defs register cleanly into `CalculationRegistry` (no
 *     `CalcRegistrationError`), so diagnostics reuse registration-time
 *     checking.
 *
 * Only the atom/expression grammar lives in `parser.ts`; line structure,
 * sections, variants, and output clauses live here.
 */

import { CalcParseError, parseExpression } from './parser';
import {
  CalculationDefinition,
  CalcNode,
  CalcScope,
  CalcVariant,
} from './types';

export interface LineFormScope {
  scope: CalcScope;
  fences?: string[];
}

export interface CompiledLineForm {
  defs: CalculationDefinition[];
  warnings: string[];
}

const SCOPE_RE = /^(segment|workout|store)\b/;

/**
 * Compile calc-line source into DAG records.
 *
 * Two document styles are accepted:
 *  - A scope header line per calc: `segment on [time, log] when P: name = …`
 *  - A bare line: `name = …` (scope from `defaultScope`, default 'segment').
 *
 * One `CalculationDefinition` per line; `where` bindings fold into the line's
 * node graph.
 */
export function compileLineForm(src: string, defaultScope?: LineFormScope): CompiledLineForm {
  const defs: CalculationDefinition[] = [];
  const warnings: string[] = [];

  let scope: CalcScope | undefined = defaultScope?.scope;
  let fences: string[] | undefined = defaultScope?.fences;
  let defWhen: string | undefined;

  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const sc = SCOPE_RE.exec(line);
    if (sc && /^(on\s|when\s|:)/.test(line.slice(sc[0].length).trim())) {
      scope = sc[1] as CalcScope;
      fences = undefined;
      defWhen = undefined;
      const header = parseSectionHeader(line.slice(sc[0].length).trim());
      fences = header.fences;
      defWhen = header.when;
      continue;
    }

    defs.push(compileLine(line, scope ?? defaultScope?.scope ?? 'segment', fences, defWhen, warnings));
  }

  return { defs, warnings };
}

function parseSectionHeader(body: string): { fences?: string[]; when?: string } {
  let rest = body.replace(/^\s*:/, '').trim();
  let fences: string[] | undefined;
  const onM = /^on\s*\[([^\]]*)\]/.exec(rest);
  if (onM) {
    fences = onM[1].split(',').map((s) => s.trim()).filter(Boolean);
    rest = rest.slice(onM[0].length).trim();
  }
  let when: string | undefined;
  const whenM = /^when\s+([\s\S]+)$/.exec(rest);
  if (whenM) when = whenM[1].replace(/:\s*$/, '').trim();
  return { fences, when };
}

// ── Tokenizing / splitting ─────────────────────────────────────────────────

interface Tok {
  pos: number;
  op?: string;   // structural operator
  word?: string; // identifier / string literal text
  isStr?: boolean;
}

/** Structural lexer: tracks paren depth, parens/braces/brackets/commas, `->`, `|`, `=`. */
function lex(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') j++;
      toks.push({ pos: i, word: src.slice(i + 1, j), isStr: true });
      i = (j < src.length ? j + 1 : j);
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === '->' || two === '==' || two === '!=' || two === '<=' || two === '>=') {
      toks.push({ pos: i, op: two }); i += 2; continue;
    }
    if ('(),[]{}|=<:'.includes(c)) { toks.push({ pos: i, op: c }); i++; continue; }
    if (/[0-9A-Za-z_.]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[0-9A-Za-z_.]/.test(src[j])) j++;
      toks.push({ pos: i, word: src.slice(i, j) });
      i = j;
      continue;
    }
    i++;
  }
  return toks;
}

/** Top-level (depth-0) positions of a structural token. */
function topLevelOf(src: string, op: string): number[] {
  const out: number[] = [];
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (depth === 0 && src.startsWith(op, i)) {
      out.push(i);
      i += op.length - 1;
    }
  }
  return out;
}

/** Top-level positions of the given keywords (identifier tokens at depth 0). */
function keywordOf(src: string, keywords: string[]): number[] {
  const toks = lex(src);
  const out: number[] = [];
  let depth = 0;
  for (const t of toks) {
    if (t.op === '(') depth++;
    else if (t.op === ')') depth--;
    else if (depth === 0 && t.word && keywords.includes(t.word)) out.push(t.pos);
  }
  return out;
}

// ── Calc line parsing ──────────────────────────────────────────────────────



/** Break a line body into variants at top-level `|`, and bindings at `where`. */
function splitVariantsAndWhere(body: string): { primary: string; variants: string[]; where?: string } {
  const pipes = topLevelOf(body, '|');
  const wherePos = keywordOf(body, ['where']).find((p) => (pipes.length ? p > pipes[pipes.length - 1] : true));
  const end = wherePos ?? body.length;
  const primary = body.slice(0, pipes.length ? pipes[0] : end).trim();
  const variants: string[] = [];
  for (let i = 0; i < pipes.length; i++) {
    const start = pipes[i] + 1;
    const stop = i + 1 < pipes.length ? pipes[i + 1] : end;
    variants.push(body.slice(start, stop).trim());
  }
  const where = wherePos !== undefined ? body.slice(wherePos + 'where'.length).trim() : undefined;
  return { primary, variants, where };
}

const CLAUSE_KEYS = ['when', 'key', 'label', 'emit', 'meta', 'estimated'];

/** Split the primary segment into expr/unit and keyword clauses. */
function splitPrimary(segment: string): { expr: string; unit?: string; clauses: Record<string, string> } {
  // Cut the expression at the earliest top-level `->` or clause keyword.
  const arrows = topLevelOf(segment, '->');
  const kwPos = keywordOf(segment, CLAUSE_KEYS);
  let cut = segment.length;
  if (arrows.length && arrows[0] < cut) cut = arrows[0];
  for (const p of kwPos) if (p < cut) cut = p;
  const expr = segment.slice(0, cut).trim();

  let tail = segment.slice(cut).trim();
  let unit: string | undefined;
  const clauses: Record<string, string> = {};
  if (tail.startsWith('->')) {
    const after = tail.slice(2).trim();
    // First clause keyword anywhere after the unit.
    const next = /(?:^|\s)(when|key|label|emit|meta|estimated)\b/.exec(after);
    const end = next ? next.index + (next[0][0] === ' ' ? 1 : 0) : after.length;
    unit = after.slice(0, end).trim() || undefined;
    tail = after.slice(end).trim();
  }
  // Iteratively consume each clause keyword's value.
  for (;;) {
    tail = tail.trim();
    if (!tail) break;
    const m = /^(when|key|label|emit|meta|estimated)\b([\s\S]*)$/.exec(tail);
    if (!m) break;
    const kw = m[1];
    const afterKw = m[2].trim();
    const next = /^(when|key|label|emit|meta|estimated)\b/.exec(afterKw);
    const val = next ? afterKw.slice(0, next.index) : afterKw;
    clauses[kw] = val.trim();
    tail = afterKw.slice(next ? next.index : afterKw.length);
  }
  return { expr, unit, clauses };
}

/** Split the where tail into bindings at top-level commas or `where` keywords. */
function splitWhereBindings(src: string): string[] {
  const out: string[] = [];
  let start = 0;
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (depth === 0 && c === ',') { out.push(src.slice(start, i)); start = i + 1; continue; }
    if (depth === 0 && src.startsWith('where', i) && !/[A-Za-z0-9_.]/.test(src[i - 1] ?? '') && !/[A-Za-z0-9_.]/.test(src[i + 5] ?? '')) {
      out.push(src.slice(start, i));
      start = i + 'where'.length;
      i += 'where'.length - 1;
    }
  }
  out.push(src.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

function parseWhere(whereSrc: string): { name: string; expr: string; unit?: string }[] {
  const out: { name: string; expr: string; unit?: string }[] = [];
  for (const p of splitWhereBindings(whereSrc)) {
    const arrow = topLevelOf(p, '->');
    let body = p;
    let unit: string | undefined;
    if (arrow.length) {
      body = p.slice(0, arrow[0]).trim();
      unit = p.slice(arrow[0] + 2).trim() || undefined;
    }
    const eq = lex(body).find((t) => t.op === '=');
    if (!eq) throw new CalcParseError(`Invalid where binding: ${p}`, 0);
    out.push({ name: body.slice(0, eq.pos).trim(), expr: body.slice(eq.pos + 1).trim(), unit });
  }
  return out;
}

function parseVariant(alt: string, primaryExpr: string): { expr?: string; unit?: string; when?: string; estimated: boolean } {
  const whenPos = keywordOf(alt, ['when'])[0];
  let rest = alt;
  let when: string | undefined;
  if (whenPos !== undefined) {
    when = alt.slice(whenPos + 'when'.length).trim();
    rest = alt.slice(0, whenPos).trim();
  }
  const estimated = /\bestimated\b/.test(rest);
  const exprPart = rest.replace(/\bestimated\b/g, '').trim();
  if (!exprPart) return { when, estimated, expr: primaryExpr };
  const { expr, unit } = splitPrimary(exprPart);
  return { expr, unit, when, estimated };
}

function buildVariant(
  variantId: string,
  priority: number,
  origin: 'analyzed' | 'analyzed-estimated',
  exprSrc: string,
  unit: string | undefined,
  bindings: { name: string; expr: string; unit?: string }[],
  when: string | undefined,
): CalcVariant {
  const nodes: Record<string, CalcNode> = {};
  nodes['value'] = { id: 'value', kind: 'expr', expression: exprSrc, ...(unit ? { unit } : {}) };
  for (const b of bindings) {
    nodes[b.name] = { id: b.name, kind: 'expr', expression: b.expr, ...(b.unit ? { unit: b.unit } : {}) };
  }
  const v: CalcVariant = { id: variantId, priority, origin, nodes };
  if (when) v.when = when;
  return v;
}

function compileLine(
  line: string,
  scope: CalcScope,
  fences: string[] | undefined,
  headerWhen: string | undefined,
  _warnings: string[],
): CalculationDefinition {
  const marker = /\(library\)/.exec(line);
  const library = !!marker;
  const live = library ? line.slice(0, marker!.index) + ' ' + line.slice(marker!.index + marker![0].length) : line;
  const eq = lex(live).find((t) => t.op === '=');
  if (!eq) throw new CalcParseError(`Missing '=' in calc line: ${line}`, 0);
  const name = live.slice(0, eq.pos).trim();
  if (!name) throw new CalcParseError('Missing calc name', 0);
  const body = live.slice(eq.pos + 1).trim();

  const { primary, variants: variantSrcs, where } = splitVariantsAndWhere(body);
  const { expr, unit, clauses } = splitPrimary(primary);
  const bindings = where ? parseWhere(where) : [];

  // Expression validation happens at registration; but cheap-parse now for
  // early structural feedback and to fail malformed input at compile time.
  parseExpression(expr);
  for (const b of bindings) parseExpression(b.expr);
  if (clauses.when) parseExpression(clauses.when);

  const lineWhen = clauses.when;
  const multi = variantSrcs.length > 0;

  const variants: CalcVariant[] = [];
  // Primary variant (may itself be `estimated`).
  const primaryOrigin: 'analyzed' | 'analyzed-estimated' =
    clauses.estimated !== undefined ? 'analyzed-estimated' : 'analyzed';
  const primaryPriority = primaryOrigin === 'analyzed-estimated' ? 10 : 100;
  const primaryWhen = multi ? lineWhen : undefined;
  variants.push(buildVariant('default', primaryPriority, primaryOrigin, expr, unit, bindings, primaryWhen ?? undefined));

  // Alternates.
  variantSrcs.forEach((altSrc, i) => {
    const alt = parseVariant(altSrc, expr);
    const vId = alt.estimated ? `est-${i + 1}` : `alt-${i + 1}`;
    const priority = i === 0 ? 50 : 10;
    variants.push(buildVariant(
      vId, priority,
      alt.estimated ? 'analyzed-estimated' : 'analyzed',
      alt.expr ?? expr, alt.unit ?? (i === 0 ? unit : undefined),
      bindings, alt.when,
    ));
  });

  let output: CalculationDefinition['output'];
  if (!library) {
    output = { nodeId: 'value', ...(unit ? { unit } : {}) };
    if (clauses.key) {
      const k = splitKeyClause(clauses.key);
      output.key = k.key;
      if (k.grouped) {
        output.isGrouped = true;
        output.groupBy = k.groupBy;
      }
    }
    if (clauses.label) output.label = clauses.label.replace(/^"|"$/g, '');
    if (clauses.emit) output.emitType = clauses.emit;
    if (clauses.meta) output.publishMetadataNodes = clauses.meta.split(',').map((s) => s.trim()).filter(Boolean);
  }

  const when = multi ? headerWhen : (lineWhen ?? headerWhen);
  const def: CalculationDefinition = {
    id: name,
    kind: library ? 'library' : 'output',
    scope,
    variants,
    ...(fences && fences.length ? { fences } : {}),
    ...(when ? { when } : {}),
  };
  if (output) def.output = output;
  return def;
}

function splitKeyClause(keyClause: string): { key: string; grouped: boolean; groupBy?: string[] } {
  const byM = /by\s*\{([^}]*)\}/.exec(keyClause);
  const grouped = keyClause.includes('grouped') || !!byM;
  const groupBy = byM ? byM[1].split(',').map((s) => s.trim()).filter(Boolean) : undefined;
  const key = keyClause.split(/\s+/).find((w) => w !== 'grouped' && !/^by$/.test(w) && !w.startsWith('{') && !w.startsWith('by')) ?? keyClause;
  return { key, grouped, groupBy };
}

// ── Printer ────────────────────────────────────────────────────────────────

/**
 * Render one `CalculationDefinition` back to canonical line form, losslessly
 * preserving everything the parser reads (scope, fences, when, variants,
 * origins, units, output clauses, intermediate nodes).
 */
/** First output node id (output.nodeId may be a single id or an array). */
export function outputNodeId(def: CalculationDefinition): string | undefined {
  const nid = def.output?.nodeId;
  if (Array.isArray(nid)) return nid[0];
  return nid;
}

export function printCalculation(def: CalculationDefinition): string {
  const lines: string[] = [];
  const header = `${def.scope}${def.fences?.length ? ` on [${def.fences.join(', ')}]` : ''}${def.when ? ` when ${def.when}` : ''}:`;
  lines.push(header);

  const sorted = [...def.variants].sort((a, b) => b.priority - a.priority);
  const primary = sorted[0];
  const outId = outputNodeId(def);
  const outNode = primary && outId && primary.nodes[outId]
    ? primary.nodes[outId]
    : undefined;
  const expr = outNode?.expression ?? (primary ? Object.values(primary.nodes)[0]?.expression : '') ?? '';

  let line = `  ${def.id}${def.kind === 'library' ? ' (library)' : ''} = ${expr}`;
  const nodeUnit = outNode?.unit;
  if (nodeUnit) line += ` -> ${nodeUnit}`;
  if (def.output) {
    if (def.output.unit && !nodeUnit) line += ` -> ${def.output.unit}`;
    if (def.output.key) {
      line += ` key ${def.output.key}`;
      if (def.output.isGrouped) {
        line += ` grouped${def.output.groupBy?.length ? ` by {${def.output.groupBy.join(', ')}}` : ''}`;
      }
    }
    if (def.output.label) line += ` label "${def.output.label}"`;
    if (def.output.emitType) line += ` emit ${def.output.emitType}`;
    if (def.output.publishMetadataNodes?.length) line += ` meta ${def.output.publishMetadataNodes.join(', ')}`;
  }
  if (primary?.origin === 'analyzed-estimated') line += ' estimated';
  if (primary?.when) line += ` when ${primary.when}`;

  // Follower variants (strip the priority-leading primary) as `|` alternates.
  for (let i = 1; i < sorted.length; i++) {
    const v = sorted[i];
    const vOut = outId ? v.nodes[outId] : undefined;
    let alt = ` | ${vOut ? vOut.expression : ''}`;
    if (vOut?.unit) alt += ` -> ${vOut.unit}`;
    if (v.origin === 'analyzed-estimated') alt += ' estimated';
    if (v.when) alt += ` when ${v.when}`;
    line += alt;
  }

  // Intermediate nodes (non-output) as `where` bindings — shared across variants.
  const seen = new Set<string>();
  for (const v of sorted) {
    for (const [id, n] of Object.entries(v.nodes)) {
      if (outId && id === outId) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      line += ` where ${id} = ${n.expression}`;
      if (n.unit) line += ` -> ${n.unit}`;
    }
  }

  lines.push(line);
  return lines.join('\n');
}
