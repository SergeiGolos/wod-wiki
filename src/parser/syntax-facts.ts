export interface SyntaxMeta {
  line: number;
  startOffset: number;
  endOffset: number;
  columnStart: number;
  columnEnd: number;
  length: number;
  raw: string;
}

interface BasePrimitive {
  kind: 'lap' | 'duration' | 'rounds' | 'action' | 'text' | 'heading' | 'quantity' | 'effort' | 'slash' | 'pipe' | 'property' | 'metric_object';
  raw: string;
  meta: SyntaxMeta;
}

export interface MetricObjectPrimitive extends BasePrimitive {
  kind: 'metric_object';
  pairs: Array<{ key: string; value: string | number | boolean | null }>;
}

export interface LapPrimitive extends BasePrimitive {
  kind: 'lap';
  lapType: 'round' | 'compose';
}

export interface DurationPrimitive extends BasePrimitive {
  kind: 'duration';
  timerRaw?: string;
  hasTrend: boolean;
  isRequired: boolean;
}

export interface RoundsPrimitive extends BasePrimitive {
  kind: 'rounds';
  sequence?: number[];
  label?: string;
}

export interface ActionPrimitive extends BasePrimitive {
  kind: 'action';
  hasColonPrefix: boolean;
}

export interface TextPrimitive extends BasePrimitive {
  kind: 'text';
}
export interface HeadingPrimitive extends BasePrimitive {
  kind: 'heading';
}


export interface QuantityPrimitive extends BasePrimitive {
  kind: 'quantity';
  value?: number;
  hasAtSign: boolean;
}

export interface EffortPrimitive extends BasePrimitive {
  kind: 'effort';
}

/**
 * Slash primitive — emitted for a bare "/" between quantities.
 * The fuseUnits dialect uses this for fraction conversion: `1/4 mile` → 0.25 mile.
 */
export interface SlashPrimitive extends BasePrimitive {
  kind: 'slash';
}

/**
 * Pipe primitive — emitted for a bare "|" between alternatives.
 * The fuseUnits dialect uses this for choice grouping: `Run | Walk` → ChoiceGroupMetric.
 */
export interface PipePrimitive extends BasePrimitive {
  kind: 'pipe';
}

export interface PropertyPrimitive extends BasePrimitive {
  kind: 'property';
  key: string;
  valueRaw: string;
  value: string | number | boolean | null;
}

export type SyntaxPrimitive =
  | LapPrimitive
  | DurationPrimitive
  | RoundsPrimitive
  | ActionPrimitive
  | TextPrimitive
  | HeadingPrimitive
  | QuantityPrimitive
  | EffortPrimitive
  | SlashPrimitive
  | PipePrimitive
  | PropertyPrimitive
  | MetricObjectPrimitive;
export interface SyntaxStatement {
  id: number;
  line: number;
  meta: SyntaxMeta;
  primitives: SyntaxPrimitive[];
  children: number[][];
  parentId?: number;
  isLeaf: boolean;
}

export interface SyntaxFacts {
  statements: SyntaxStatement[];
}
