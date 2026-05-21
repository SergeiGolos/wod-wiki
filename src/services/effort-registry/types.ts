export type EffortRegistrySource = 'bundled' | 'user' | 'synthetic-unresolved';

export type EffortVisibility = 'bundled' | 'private' | 'shared-template';

export type EffortIntensityTier = 'recovery' | 'easy' | 'moderate' | 'hard' | 'max';

export type EffortAttributeValue = string | number | boolean | undefined;

export interface EffortBaseAttributes {
  met?: number;
  intensity?: number;
  [key: string]: EffortAttributeValue;
}

export interface EffortDerivation {
  parentSlug: string;
  coefficients?: Record<string, number>;
  hardOverrides?: Record<string, EffortAttributeValue>;
}

export interface EffortRecord {
  id: string;
  slug: string;
  label: string;
  aliases: string[];
  description?: string;
  discipline: string;
  modality: string;
  intensityTier?: EffortIntensityTier;
  baseAttributes: EffortBaseAttributes;
  derivation?: EffortDerivation;
  visibility: EffortVisibility;
  registrySource: EffortRegistrySource;
  createdAt: string;
  updatedAt: string;
}

export type EffortResolutionStage = 'compiler' | 'analyzer';

export type EffortResolutionMatchType =
  | 'exact-slug'
  | 'exact-alias'
  | 'normalized-alias'
  | 'fuzzy'
  | 'fallback';

export interface EffortResolutionTrace {
  input: string;
  normalizedInput: string;
  resolutionStage: EffortResolutionStage;
  matchType: EffortResolutionMatchType;
  matchedSlug?: string;
  threshold?: number;
  distance?: number;
}

export interface EffortResolutionResult {
  effort: EffortRecord;
  trace: EffortResolutionTrace;
}

export interface ResolveEffortOptions {
  stage?: EffortResolutionStage;
  threshold?: number;
  allowSyntheticFallback?: boolean;
}

export interface ResolveFuzzyOptions {
  stage?: EffortResolutionStage;
  threshold?: number;
}

export interface IEffortResolver {
  resolveBySlug(slug: string): EffortRecord | null;
  resolveByAlias(label: string): EffortRecord | null;
  resolveFuzzy(label: string, options?: ResolveFuzzyOptions): EffortResolutionResult | null;
  resolveLabel(label: string, options?: ResolveEffortOptions): EffortResolutionResult | null;
  list(): readonly EffortRecord[];
  getLastTrace(): EffortResolutionTrace | null;
}

export interface IEffortStore {
  loadBundled(): Promise<readonly EffortRecord[]>;
  loadUser(): Promise<readonly EffortRecord[]>;
  writeUser(effort: EffortRecord): Promise<void>;
  removeUser(slug: string): Promise<void>;
}

export interface EffortRegistryOptions {
  defaultFuzzyThreshold?: number;
  unresolvedMetFallback?: number;
}
