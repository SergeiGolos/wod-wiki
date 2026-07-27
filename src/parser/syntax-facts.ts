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
  kind: 'lap' | 'duration' | 'rounds' | 'action' | 'text' | 'heading' | 'quantity' | 'effort' | 'property' | 'metric_object';
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

/**
 * Effort primitive — emitted for any free text including the bare "/" and "|"
 * separator tokens. Slash/Pipe were grammar-level primitives consumed only by
 * fuseUnits; they now ride as `EffortPrimitive` with raw '/' or '|' and the
 * dialect matches the raw string:
 *   1/4 mile → 0.25 mile (slash converts to a single decimal)
 *   Run | Walk → ChoiceGroupMetric([Effort('Run'), Effort('Walk')]) (pipe groups)
 */
export interface EffortPrimitive extends BasePrimitive {
  kind: 'effort';
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
