import { MetricType } from '../models/Metric';
import { TimeSpan } from '../models/TimeSpan';
import type { IOutputStatement } from '../models/OutputStatement';
import type { ISummaryProcessor } from './ISummaryProcessor';
import type { ProjectionResult } from './ProjectionResult';

const AGGREGATE_FUNCTIONS = new Set(['sum', 'mean', 'max', 'min', 'count']);

export interface CalculationDefinition {
  readonly target: string;
  readonly expression: string;
  readonly raw: string;
  readonly line: number;
  readonly ast: ExpressionNode;
  readonly sources: string[];
}

export interface CalculateBlockParseError {
  readonly line: number;
  readonly raw: string;
  readonly message: string;
}

export interface CalculateBlockParseResult {
  readonly definitions: CalculationDefinition[];
  readonly errors: CalculateBlockParseError[];
}

interface CalculationRow {
  readonly source: IOutputStatement;
  readonly values: Map<string, number>;
}

interface EvaluationContext {
  readonly rows: CalculationRow[];
  readonly computed: Map<string, number>;
}

type ExpressionNode =
  | NumberNode
  | IdentifierNode
  | UnaryNode
  | BinaryNode
  | CallNode;

interface NumberNode {
  readonly kind: 'number';
  readonly value: number;
}

interface IdentifierNode {
  readonly kind: 'identifier';
  readonly name: string;
}

interface UnaryNode {
  readonly kind: 'unary';
  readonly operator: '+' | '-';
  readonly argument: ExpressionNode;
}

interface BinaryNode {
  readonly kind: 'binary';
  readonly operator: '+' | '-' | '*' | '/' | '^';
  readonly left: ExpressionNode;
  readonly right: ExpressionNode;
}

interface CallNode {
  readonly kind: 'call';
  readonly name: string;
  readonly args: ExpressionNode[];
}

type TokenKind = 'number' | 'identifier' | 'operator' | 'paren' | 'comma' | 'eof';

interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  readonly index: number;
}

interface TokenStream {
  readonly tokens: Token[];
  readonly text: string;
  index: number;
}

interface NumericCandidate {
  readonly key: string;
  readonly value: number;
}

export class CalculateBlockProcessor implements ISummaryProcessor {
  public readonly id = 'calculate-block';
  public readonly name = 'CalculateBlockProcessor';

  constructor(private readonly definitions: readonly CalculationDefinition[]) {}

  summarize(outputs: IOutputStatement[]): ProjectionResult[] {
    return evaluateCalculateDefinitions(this.definitions, outputs);
  }
}

/**
 * Parse a `calculate` block into assignment definitions.
 */
export function parseCalculateBlock(content: string): CalculateBlockParseResult {
  const definitions: CalculationDefinition[] = [];
  const errors: CalculateBlockParseError[] = [];

  if (!content || !content.trim()) {
    return { definitions, errors };
  }

  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index];
    const trimmed = raw.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      continue;
    }

    const assignment = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
    if (!assignment) {
      errors.push({
        line: index + 1,
        raw,
        message: 'Expected `target = expression`',
      });
      continue;
    }

    const target = assignment[1];
    const expression = assignment[2].trim();

    try {
      const stream = tokenize(expression);
      const ast = parseExpression(stream);
      expectEnd(stream);
      definitions.push({
        target,
        expression,
        raw,
        line: index + 1,
        ast,
        sources: collectSources(ast),
      });
    } catch (error) {
      errors.push({
        line: index + 1,
        raw,
        message: error instanceof Error ? error.message : 'Invalid expression',
      });
    }
  }

  return { definitions, errors };
}

/**
 * Evaluate calculate definitions against runtime output statements.
 */
export function evaluateCalculateDefinitions(
  definitions: readonly CalculationDefinition[],
  outputs: readonly IOutputStatement[],
): ProjectionResult[] {
  if (!definitions.length || !outputs.length) {
    return [];
  }

  const rows = buildCalculationRows(outputs);
  if (rows.length === 0) {
    return [];
  }

  const computed = new Map<string, number>();
  const now = new Date();
  const results: ProjectionResult[] = [];

  for (const definition of definitions) {
    const value = evaluateDefinition(definition, { rows, computed });
    if (value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
      continue;
    }

    computed.set(normalizeName(definition.target), value);
    results.push({
      name: definition.target,
      value,
      unit: '',
      metricType: MetricType.Calculated,
      timeSpan: { started: now.getTime(), ended: now.getTime() },
      origin: 'runtime',
      metadata: {
        target: definition.target,
        expression: definition.expression,
        sources: definition.sources,
        line: definition.line,
        rowCount: rows.length,
      },
    });
  }

  return results;
}

function evaluateDefinition(
  definition: CalculationDefinition,
  context: EvaluationContext,
): number | undefined {
  return evaluateNode(definition.ast, context, undefined);
}

function evaluateNode(
  node: ExpressionNode,
  context: EvaluationContext,
  row: CalculationRow | undefined,
): number | undefined {
  switch (node.kind) {
    case 'number':
      return node.value;

    case 'identifier':
      return resolveIdentifier(node.name, context, row);

    case 'unary': {
      const value = evaluateNode(node.argument, context, row);
      if (value === undefined) return undefined;
      return node.operator === '-' ? -value : value;
    }

    case 'binary': {
      const left = evaluateNode(node.left, context, row);
      const right = evaluateNode(node.right, context, row);
      if (left === undefined || right === undefined) return undefined;

      switch (node.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return right === 0 ? undefined : left / right;
        case '^': return Math.pow(left, right);
      }
    }

    case 'call':
      return evaluateCall(node, context);
  }
}

function evaluateCall(
  node: CallNode,
  context: EvaluationContext,
): number | undefined {
  const name = node.name.toLowerCase();

  if (!AGGREGATE_FUNCTIONS.has(name)) {
    return undefined;
  }

  const values: number[] = [];

  if (name === 'count' && node.args.length === 0) {
    return context.rows.length;
  }

  for (const candidateRow of context.rows) {
    if (node.args.length === 0) {
      values.push(1);
      continue;
    }

    const value = evaluateNode(node.args[0], context, candidateRow);
    if (value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
      continue;
    }
    values.push(value);
  }

  if (name === 'count') {
    return values.length;
  }

  if (values.length === 0) {
    return name === 'sum' ? 0 : undefined;
  }

  switch (name) {
    case 'sum':
      return values.reduce((sum, value) => sum + value, 0);
    case 'mean':
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
  }
}

function resolveIdentifier(
  name: string,
  context: EvaluationContext,
  row: CalculationRow | undefined,
): number | undefined {
  const normalized = normalizeName(name);

  if (row) {
    const rowValue = row.values.get(normalized);
    if (rowValue !== undefined) {
      return rowValue;
    }
  }

  return context.computed.get(normalized);
}

function buildCalculationRows(outputs: readonly IOutputStatement[]): CalculationRow[] {
  const rows: CalculationRow[] = [];

  for (const output of outputs) {
    const values = new Map<string, number>();
    const metrics = typeof output.getDisplayMetrics === 'function'
      ? output.getDisplayMetrics()
      : output.rawMetrics;

    for (const metric of metrics) {
      const candidates = extractNumericCandidates(output, metric);
      for (const candidate of candidates) {
        values.set(candidate.key, candidate.value);
      }
    }

    if (values.size > 0) {
      rows.push({ source: output, values });
    }
  }

  return rows;
}

function extractNumericCandidates(
  output: IOutputStatement,
  metric: { type: string; value?: unknown; key?: string; unit?: string },
): NumericCandidate[] {
  const candidates: NumericCandidate[] = [];
  const type = normalizeName(metric.type);

  const numberValue = extractNumber(metric.value);
  if (numberValue !== undefined) {
    if (typeof metric.key === 'string' && metric.key.trim()) {
      candidates.push({ key: normalizeName(metric.key), value: numberValue });
    }

    switch (type) {
      case normalizeName(String(MetricType.Rep)):
        candidates.push({ key: 'rep', value: numberValue });
        candidates.push({ key: 'reps', value: numberValue });
        break;
      case normalizeName(String(MetricType.Resistance)):
        candidates.push({ key: 'weight', value: numberValue });
        candidates.push({ key: 'resistance', value: numberValue });
        candidates.push({ key: 'amount', value: numberValue });
        break;
      case normalizeName(String(MetricType.Distance)):
        candidates.push({ key: 'distance', value: numberValue });
        break;
      case normalizeName(String(MetricType.Intensity)):
        candidates.push({ key: 'intensity', value: numberValue });
        break;
      case normalizeName(String(MetricType.Load)):
        candidates.push({ key: 'load', value: numberValue });
        break;
      case normalizeName(String(MetricType.Volume)):
        candidates.push({ key: 'volume', value: numberValue });
        break;
      case normalizeName(String(MetricType.Work)):
        candidates.push({ key: 'work', value: numberValue });
        break;
      case normalizeName(String(MetricType.RIR)):
        candidates.push({ key: 'rir', value: numberValue });
        break;
      case normalizeName(String(MetricType.SessionRPE)):
        candidates.push({ key: 'rpe', value: numberValue });
        break;
      case normalizeName(String(MetricType.METScore)):
        candidates.push({ key: 'metscore', value: numberValue });
        break;
      case normalizeName(String(MetricType.TIS)):
        candidates.push({ key: 'tis', value: numberValue });
        break;
      case normalizeName(String(MetricType.Calculated)):
        candidates.push({ key: 'calculated', value: numberValue });
        break;
    }
  }

  const durationSeconds = output.elapsed / 1000;
  if (Number.isFinite(durationSeconds) && durationSeconds >= 0) {
    candidates.push({ key: 'duration', value: durationSeconds });
    candidates.push({ key: 'elapsed', value: durationSeconds });
  }

  return candidates;
}

function extractNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object' && 'amount' in value) {
    const amount = (value as { amount?: unknown }).amount;
    if (typeof amount === 'number' && Number.isFinite(amount)) {
      return amount;
    }
  }

  return undefined;
}

function tokenize(text: string): TokenStream {
  const tokens: Token[] = [];
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (/\s/.test(char)) {
      index++;
      continue;
    }

    const start = index;
    if (/[0-9.]/.test(char)) {
      let end = index + 1;
      while (end < text.length && /[0-9.]/.test(text[end])) {
        end++;
      }
      const value = text.slice(start, end);
      if (!/^\d+(?:\.\d+)?$/.test(value) && !/^\.\d+$/.test(value)) {
        throw new Error(`Invalid number '${value}'`);
      }
      tokens.push({ kind: 'number', value, index: start });
      index = end;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let end = index + 1;
      while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) {
        end++;
      }
      tokens.push({ kind: 'identifier', value: text.slice(start, end), index: start });
      index = end;
      continue;
    }

    if ('+-*/^'.includes(char)) {
      tokens.push({ kind: 'operator', value: char, index: start });
      index++;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char, index: start });
      index++;
      continue;
    }

    if (char === ',') {
      tokens.push({ kind: 'comma', value: char, index: start });
      index++;
      continue;
    }

    throw new Error(`Unexpected token '${char}' at column ${start + 1}`);
  }

  tokens.push({ kind: 'eof', value: '', index: text.length });
  return { tokens, text, index: 0 };
}

function parseExpression(stream: TokenStream): ExpressionNode {
  return parseAddition(stream);
}

function parseAddition(stream: TokenStream): ExpressionNode {
  let node = parseMultiplication(stream);

  while (matchOperator(stream, '+', '-')) {
    const operator = consume(stream).value as '+' | '-';
    const right = parseMultiplication(stream);
    node = { kind: 'binary', operator, left: node, right };
  }

  return node;
}

function parseMultiplication(stream: TokenStream): ExpressionNode {
  let node = parsePower(stream);

  while (matchOperator(stream, '*', '/')) {
    const operator = consume(stream).value as '*' | '/';
    const right = parsePower(stream);
    node = { kind: 'binary', operator, left: node, right };
  }

  return node;
}

function parsePower(stream: TokenStream): ExpressionNode {
  const node = parseUnary(stream);

  if (matchOperator(stream, '^')) {
    const operator = consume(stream).value as '^';
    const right = parsePower(stream);
    return { kind: 'binary', operator, left: node, right };
  }

  return node;
}

function parseUnary(stream: TokenStream): ExpressionNode {
  if (matchOperator(stream, '+', '-')) {
    const operator = consume(stream).value as '+' | '-';
    return { kind: 'unary', operator, argument: parseUnary(stream) };
  }

  return parsePrimary(stream);
}

function parsePrimary(stream: TokenStream): ExpressionNode {
  const token = peek(stream);

  if (token.kind === 'number') {
    consume(stream);
    return { kind: 'number', value: Number(token.value) };
  }

  if (token.kind === 'identifier') {
    consume(stream);
    if (matchParen(stream, '(')) {
      consume(stream);
      const args: ExpressionNode[] = [];
      if (!matchParen(stream, ')')) {
        while (true) {
          args.push(parseExpression(stream));
          if (matchComma(stream)) {
            consume(stream);
            continue;
          }
          break;
        }
      }
      expectParen(stream, ')');
      return { kind: 'call', name: token.value, args };
    }

    return { kind: 'identifier', name: token.value };
  }

  if (matchParen(stream, '(')) {
    consume(stream);
    const node = parseExpression(stream);
    expectParen(stream, ')');
    return node;
  }

  throw new Error(`Unexpected token '${token.value || 'end of input'}' at column ${token.index + 1}`);
}

function expectEnd(stream: TokenStream): void {
  const token = peek(stream);
  if (token.kind !== 'eof') {
    throw new Error(`Unexpected token '${token.value}' at column ${token.index + 1}`);
  }
}

function peek(stream: TokenStream): Token {
  return stream.tokens[stream.index] ?? stream.tokens[stream.tokens.length - 1];
}

function consume(stream: TokenStream): Token {
  const token = peek(stream);
  stream.index += 1;
  return token;
}

function matchOperator(stream: TokenStream, ...operators: Array<'+' | '-' | '*' | '/' | '^'>): boolean {
  const token = peek(stream);
  return token.kind === 'operator' && operators.includes(token.value as any);
}

function matchParen(stream: TokenStream, value: '(' | ')'): boolean {
  const token = peek(stream);
  return token.kind === 'paren' && token.value === value;
}

function matchComma(stream: TokenStream): boolean {
  return peek(stream).kind === 'comma';
}

function expectParen(stream: TokenStream, value: '(' | ')'): void {
  const token = peek(stream);
  if (!matchParen(stream, value)) {
    throw new Error(`Expected '${value}' at column ${token.index + 1}`);
  }
  consume(stream);
}

function collectSources(node: ExpressionNode): string[] {
  const sources = new Map<string, string>();

  const visit = (current: ExpressionNode): void => {
    switch (current.kind) {
      case 'identifier':
        if (!AGGREGATE_FUNCTIONS.has(current.name.toLowerCase())) {
          sources.set(normalizeName(current.name), current.name);
        }
        return;
      case 'unary':
        visit(current.argument);
        return;
      case 'binary':
        visit(current.left);
        visit(current.right);
        return;
      case 'call':
        for (const arg of current.args) visit(arg);
        return;
      case 'number':
        return;
    }
  };

  visit(node);
  return Array.from(sources.values());
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}
