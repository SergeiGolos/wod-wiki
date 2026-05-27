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
  kind: 'lap' | 'duration' | 'rounds' | 'action' | 'text' | 'quantity' | 'effort' | 'property' | 'metric_object';
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

export interface QuantityPrimitive extends BasePrimitive {
  kind: 'quantity';
  value?: number;
  unit: string;
  hasAtSign: boolean;
  hasWeightUnit: boolean;
  hasDistanceUnit: boolean;
}

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
