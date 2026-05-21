import { levenshteinDistance } from './levenshtein';
import { normalizeExactLookupValue, normalizeLookupValue, slugifyEffort } from './normalization';
import type {
  EffortRecord,
  EffortRegistryOptions,
  EffortResolutionResult,
  EffortResolutionTrace,
  IEffortResolver,
  IEffortStore,
  ResolveEffortOptions,
  ResolveFuzzyOptions,
} from './types';
import { assertValidEffortBatch, assertValidEffortRecord } from './validation';

interface FuzzyCandidate {
  effort: EffortRecord;
  alias: string;
  normalizedAlias: string;
}

export class EffortRegistry implements IEffortResolver {
  private bundledRecords: EffortRecord[] = [];
  private userRecords: EffortRecord[] = [];
  private effectiveRecords: EffortRecord[] = [];
  private bySlug = new Map<string, EffortRecord>();
  private exactAliasIndex = new Map<string, EffortRecord>();
  private normalizedAliasIndex = new Map<string, EffortRecord>();
  private fuzzyCandidates: FuzzyCandidate[] = [];
  private lastTrace: EffortResolutionTrace | null = null;
  private readonly defaultFuzzyThreshold: number;
  private readonly unresolvedMetFallback: number;
  private loaded = false;

  constructor(
    private readonly store: IEffortStore,
    options: EffortRegistryOptions = {},
  ) {
    this.defaultFuzzyThreshold = options.defaultFuzzyThreshold ?? 2;
    this.unresolvedMetFallback = options.unresolvedMetFallback ?? 5;
  }

  async load(): Promise<void> {
    this.bundledRecords = [...await this.store.loadBundled()];
    this.userRecords = [...await this.store.loadUser()];

    assertValidEffortBatch(this.bundledRecords, 'bundledRecords');
    assertValidEffortBatch(this.userRecords, 'userRecords');

    this.rebuildIndexes();
    this.loaded = true;
  }

  async upsert(effort: EffortRecord): Promise<void> {
    this.ensureLoaded();
    assertValidEffortRecord(effort, 'effort');

    await this.store.writeUser(effort);

    const index = this.userRecords.findIndex(candidate => candidate.slug === effort.slug);
    if (index >= 0) {
      this.userRecords[index] = effort;
    } else {
      this.userRecords.push(effort);
    }

    this.rebuildIndexes();
  }

  async remove(slug: string): Promise<void> {
    this.ensureLoaded();
    await this.store.removeUser(slug);
    this.userRecords = this.userRecords.filter(effort => effort.slug !== slug);
    this.rebuildIndexes();
  }

  list(): readonly EffortRecord[] {
    this.ensureLoaded();
    return [...this.effectiveRecords];
  }

  resolveBySlug(slug: string): EffortRecord | null {
    this.ensureLoaded();
    return this.bySlug.get(slugifyEffort(slug)) ?? null;
  }

  resolveByAlias(label: string): EffortRecord | null {
    this.ensureLoaded();

    const exact = this.exactAliasIndex.get(normalizeExactLookupValue(label));
    if (exact) {
      return exact;
    }

    return this.normalizedAliasIndex.get(normalizeLookupValue(label)) ?? null;
  }

  resolveFuzzy(label: string, options: ResolveFuzzyOptions = {}): EffortResolutionResult | null {
    this.ensureLoaded();

    const normalizedInput = normalizeLookupValue(label);
    if (!normalizedInput) {
      return null;
    }

    const threshold = options.threshold ?? this.defaultFuzzyThreshold;
    let best: { effort: EffortRecord; distance: number } | null = null;

    for (const candidate of this.fuzzyCandidates) {
      const distance = levenshteinDistance(normalizedInput, candidate.normalizedAlias);
      if (distance > threshold) {
        continue;
      }

      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance && candidate.effort.registrySource === 'user' && best.effort.registrySource !== 'user')
      ) {
        best = { effort: candidate.effort, distance };
      }
    }

    if (!best) {
      return null;
    }

    const trace: EffortResolutionTrace = {
      input: label,
      normalizedInput,
      resolutionStage: options.stage ?? 'analyzer',
      matchType: 'fuzzy',
      matchedSlug: best.effort.slug,
      threshold,
      distance: best.distance,
    };

    this.lastTrace = trace;
    return { effort: best.effort, trace };
  }

  resolveLabel(label: string, options: ResolveEffortOptions = {}): EffortResolutionResult | null {
    this.ensureLoaded();

    const stage = options.stage ?? 'analyzer';
    const normalizedInput = normalizeLookupValue(label);
    const exactInput = normalizeExactLookupValue(label);
    const slug = slugifyEffort(label);

    const bySlug = this.bySlug.get(slug);
    if (bySlug) {
      return this.finish(label, normalizedInput, stage, 'exact-slug', bySlug);
    }

    const exactAlias = this.exactAliasIndex.get(exactInput);
    if (exactAlias) {
      return this.finish(label, normalizedInput, stage, 'exact-alias', exactAlias);
    }

    const normalizedAlias = this.normalizedAliasIndex.get(normalizedInput);
    if (normalizedAlias) {
      return this.finish(label, normalizedInput, stage, 'normalized-alias', normalizedAlias);
    }

    const fuzzy = this.resolveFuzzy(label, {
      stage,
      threshold: options.threshold,
    });
    if (fuzzy) {
      return fuzzy;
    }

    if (options.allowSyntheticFallback === false) {
      return null;
    }

    const syntheticEffort = this.createSyntheticUnresolvedEffort(label);
    return this.finish(label, normalizedInput, stage, 'fallback', syntheticEffort);
  }

  getLastTrace(): EffortResolutionTrace | null {
    return this.lastTrace;
  }

  private finish(
    input: string,
    normalizedInput: string,
    stage: EffortResolutionTrace['resolutionStage'],
    matchType: EffortResolutionTrace['matchType'],
    effort: EffortRecord,
  ): EffortResolutionResult {
    const trace: EffortResolutionTrace = {
      input,
      normalizedInput,
      resolutionStage: stage,
      matchType,
      matchedSlug: effort.slug,
    };

    this.lastTrace = trace;
    return { effort, trace };
  }

  private createSyntheticUnresolvedEffort(label: string): EffortRecord {
    const timestamp = new Date().toISOString();
    const syntheticSlug = `unresolved-${slugifyEffort(label)}`;

    return {
      id: `synthetic-${syntheticSlug}`,
      slug: syntheticSlug,
      label,
      aliases: [label],
      description: `Synthetic unresolved effort derived from '${label}'`,
      discipline: 'unknown',
      modality: 'unknown',
      intensityTier: 'moderate',
      baseAttributes: {
        met: this.unresolvedMetFallback,
        unresolvedInput: label,
      },
      visibility: 'private',
      registrySource: 'synthetic-unresolved',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private rebuildIndexes(): void {
    const bundledBySlug = new Map(this.bundledRecords.map(effort => [effort.slug, effort] as const));
    const userBySlug = new Map(this.userRecords.map(effort => [effort.slug, effort] as const));

    const effective = new Map<string, EffortRecord>();

    for (const [slug, effort] of bundledBySlug.entries()) {
      effective.set(slug, effort);
    }

    for (const [slug, effort] of userBySlug.entries()) {
      effective.set(slug, effort);
    }

    const bundledOnly = this.bundledRecords.filter(effort => !userBySlug.has(effort.slug));
    this.effectiveRecords = [...this.userRecords, ...bundledOnly];
    this.bySlug = effective;
    this.exactAliasIndex = new Map();
    this.normalizedAliasIndex = new Map();
    this.fuzzyCandidates = [];

    const aliasOwnership = new Map<string, string>();

    for (const effort of this.effectiveRecords) {
      const aliases = new Set<string>([effort.label, effort.slug, ...effort.aliases]);

      for (const alias of aliases) {
        const exactKey = normalizeExactLookupValue(alias);
        if (!this.exactAliasIndex.has(exactKey)) {
          this.exactAliasIndex.set(exactKey, effort);
        }

        const normalizedAlias = normalizeLookupValue(alias);
        if (!normalizedAlias) {
          continue;
        }

        const owner = aliasOwnership.get(normalizedAlias);
        if (owner && owner !== effort.slug) {
          throw new TypeError(
            `Duplicate normalized alias '${normalizedAlias}' across '${owner}' and '${effort.slug}'`,
          );
        }

        aliasOwnership.set(normalizedAlias, effort.slug);
        this.normalizedAliasIndex.set(normalizedAlias, effort);
        this.fuzzyCandidates.push({ effort, alias, normalizedAlias });
      }
    }
  }

  private ensureLoaded(): void {
    if (!this.loaded) {
      throw new Error('EffortRegistry.load() must be awaited before use');
    }
  }
}
