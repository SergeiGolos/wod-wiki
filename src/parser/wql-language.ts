/**
 * WQL language support — CodeMirror highlighting + autocomplete over the
 * Lezer grammar (src/grammar/wql.grammar, house pattern beside
 * whiteboard-script-language.ts).
 *
 * The completion vocabulary is the analytics dictionary:
 *   - aggregators from the AST contract (WQL_AGGREGATORS)
 *   - Canonical Metric Keys (CONTEXT.md §Analytics): base families, Tier-2
 *     aggregates, and `<effortSlug>.<family>` for every known effort
 *   - Tag keys read off fact rows by the Query Service, with value
 *     vocabularies for discipline (canonical EFFORT_DISCIPLINES), intensity,
 *     and grain; effort values come from the EffortResolver
 *   - virtual dimensions day | week | session | round
 */

import { LRLanguage, LanguageSupport, syntaxTree, HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { autocompletion, CompletionContext, CompletionResult, Completion, snippetCompletion } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import { styleTags, tags as t } from "@lezer/highlight";
import type { SyntaxNode } from "@lezer/common";
import { parser } from "../grammar/wql.parser";
import { WQL_AGGREGATORS } from "@/services/analytics/query/wql";
import { EFFORT_DISCIPLINES } from "@/effort-registry/disciplines";

// ── Vocabulary ─────────────────────────────────────────────────────

/** Canonical Metric Key families (CONTEXT.md §Analytics). */
export const WQL_METRIC_FAMILIES = ['reps', 'distance', 'resistance', 'elapsed', 'power', 'pace'] as const;

/** Tier-2 aggregate keys written to the Analytics Store. */
export const WQL_METRIC_AGGREGATES = ['totalVolume', 'totalDistance', 'tis', 'sessionLoad'] as const;

/** Tag keys the Query Service reads off a fact row (QueryService.factTagValue). */
export const WQL_TAG_KEYS = [
  'effort', 'discipline', 'intensity', 'note', 'page', 'origin',
  'grain', 'metric', 'block', 'result', 'tags',
] as const;

/** Virtual dimensions — time buckets and stream positions, not fact fields. */
export const WQL_VIRTUAL_DIMS = ['day', 'week', 'session', 'round'] as const;

/** Rollup Fact targets written by the lazy rollup driver (CONTEXT.md 'Rollup Fact'). */
export const WQL_CALC_TARGETS = ['calc.acwr', 'calc.monotony', 'calc.strain'] as const;

const INTENSITY_TIERS = ['low', 'moderate', 'high'] as const;
const GRAINS = ['segment', 'summary', 'rollup'] as const;

/** Content-discovery query targets (find:<target>). */
export const WQL_FIND_TARGETS = ['note', 'block'] as const;

/** Content query scopes (in <scope>). */
export const WQL_SCOPES = ['journal', 'collections', 'feeds', 'all'] as const;

/** Content-specific filter keys (beyond the analytics tag keys). */
export const WQL_CONTENT_FILTER_KEYS = ['type', 'text', 'has', ...WQL_TAG_KEYS] as const;

// ── Highlighting ───────────────────────────────────────────────────

export const wqlLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        // Rule styles color stray punctuation; the Word tokens inside carry
        // the visible styling (unstyled children reset the parent class).
        Aggregator: t.keyword,
        "Aggregator/Word": t.keyword,
        Metric: t.variableName,
        "Metric/Word": t.variableName,
        TagKey: t.propertyName,
        "TagKey/Word": t.propertyName,
        TagValue: t.string,
        "TagValue/Word": t.string,
        Negate: t.operator,
        Star: t.operator,
        Dimension: t.attributeName,
        "Dimension/Word": t.attributeName,
        By: t.keyword,
        RollupDot: t.keyword,
        Int: t.number,
        "Rollup/Word": t.unit,
        braceOpen: t.bracket,
        braceClose: t.bracket,
        parenOpen: t.bracket,
        parenClose: t.bracket,
        colon: t.punctuation,
        comma: t.punctuation,
        pipe: t.punctuation,
        dot: t.punctuation,
      })
    ]
  }),
  languageData: {
    closeBrackets: { brackets: ["{", "("] },
  }
});

// ── Completion ─────────────────────────────────────────────────────

export interface WqlCompletionOptions {
  /**
   * Effort slugs for `{effort:…}` values and `<effortSlug>.<family>` metric
   * keys — feed from the EffortResolver:
   * `() => resolver.list().map(e => e.slug)`.
   */
  effortNames?: () => readonly string[];
}

/** Nearest ancestor (or self) of `node` with one of `names`. */
function ancestor(node: SyntaxNode | null, ...names: string[]): SyntaxNode | null {
  for (let n = node; n; n = n.parent) {
    if (names.includes(n.name)) return n;
  }
  return null;
}

function options(labels: readonly (string | Completion)[]): Completion[] {
  return labels.map((label) => (typeof label === 'string' ? { label } : label));
}

export function wqlCompletionSource(options_: WqlCompletionOptions = {}) {
  const { effortNames } = options_;

  const metricOptions = (): Completion[] => {
    const efforts = effortNames?.() ?? [];
    return [
      ...options(WQL_METRIC_AGGREGATES).map((c) => ({ ...c, type: 'constant' })),
      ...options(WQL_METRIC_FAMILIES).map((c) => ({ ...c, type: 'variable' })),
      ...options(efforts.flatMap((slug) => WQL_METRIC_FAMILIES.map((family) => `${slug}.${family}`)))
        .map((c) => ({ ...c, type: 'variable' })),
      ...options(WQL_CALC_TARGETS).map((c) => ({ ...c, type: 'namespace' })),
      snippetCompletion('calc.${target}', { label: 'calc.', detail: 'calculated target', type: 'namespace' }),
    ];
  };

  const tagValueOptions = (key: string): Completion[] | null => {
    switch (key) {
      case 'effort': return options(effortNames?.() ?? []);
      case 'discipline': return options(EFFORT_DISCIPLINES);
      case 'intensity': return options(INTENSITY_TIERS);
      case 'grain': return options(GRAINS);
      case 'metric': return metricOptions();
      default: return null; // note/page/block/result/tags — free-form
    }
  };

  function source(context: CompletionContext): CompletionResult | null {
    const word = context.matchBefore(/[\w.*-]*/)!;
    if (!word || (word.from === word.to && !context.explicit)) return null;
    const tree = syntaxTree(context.state);
    const node = tree.resolveInner(context.pos, -1);

    // Inside a Filter: before the colon → tag keys; after → values for that key.
    const filter = ancestor(node, 'Filter');
    if (filter) {
      const filterText = context.state.sliceDoc(filter.from, context.pos);
      const colonIndex = filterText.indexOf(':');
      if (colonIndex === -1) {
        const keyWord = context.matchBefore(/[\w-]*/)!;
        return { from: keyWord.from, options: options(WQL_TAG_KEYS).map((c) => ({ ...c, type: 'property' })), validFor: /^[\w-]*$/ };
      }
      const key = filterText.slice(0, colonIndex).replace(/^!/, '').trim();
      const valueOptions = tagValueOptions(key);
      if (!valueOptions) return null;
      return { from: word.from, options: valueOptions, validFor: /^[\w*-]*$/ };
    }

    // Inside Filters braces but not in a parsed Filter yet (e.g. `{` + cursor).
    if (ancestor(node, 'Filters')) {
      const keyWord = context.matchBefore(/[\w-]*/)!;
      return { from: keyWord.from, options: options(WQL_TAG_KEYS).map((c) => ({ ...c, type: 'property' })), validFor: /^[\w-]*$/ };
    }

    // Inside GroupBy: virtual dims + tag keys.
    if (ancestor(node, 'GroupBy')) {
      const dimWord = context.matchBefore(/[\w-]*/)!;
      return {
        from: dimWord.from,
        options: [
          ...options(WQL_VIRTUAL_DIMS).map((c) => ({ ...c, type: 'atom' })),
          ...options(WQL_TAG_KEYS).map((c) => ({ ...c, type: 'property' })),
        ],
        validFor: /^[\w-]*$/,
      };
    }

    // Head-relative positions. The top node's Head child tells whether the
    // query already has a complete head; node ancestry tells whether the
    // cursor sits inside it.
    const head = tree.topNode.getChild('Head');
    const insideHead = ancestor(node, 'Head') !== null;
    const inMetric = node.name === 'Metric' || (node.name === 'Word' && node.parent?.name === 'Metric');

    if (inMetric) {
      return { from: word.from, options: metricOptions(), validFor: /^[\w.-]*$/ };
    }

    if (insideHead && head) {
      // Inside the head: before the colon → aggregators, after → metrics
      // (the error-tolerant tree may not have grown a Metric yet).
      const afterColon = context.state.sliceDoc(head.from, context.pos).includes(':');
      // The error-tolerant parser absorbs a space-separated word after the
      // metric into the Metric node — whitespace after the metric's first
      // word means the user is typing past it (`sum:tis by …`).
      const metricWord = head.getChild('Metric')?.getChild('Word');
      const typedPastMetric = metricWord !== null && metricWord !== undefined
        && /\s/.test(context.state.sliceDoc(metricWord.to, context.pos));
      if (afterColon && !typedPastMetric) {
        return { from: word.from, options: metricOptions(), validFor: /^[\w.-]*$/ };
      }
      if (!afterColon) {
        return { from: word.from, options: options(WQL_AGGREGATORS).map((c) => ({ ...c, type: 'keyword' })), validFor: /^[\w-]*$/ };
      }
    }

    // Inside .rollup(…): period sizes.
    if (ancestor(node, 'Rollup')) {
      return {
        from: word.from,
        options: options(['1d', '7d', '1w', '2w', '4w']).map((c) => ({ ...c, type: 'constant' })),
        validFor: /^[\w]*$/,
      };
    }

    // Query start — no head yet → aggregators. Past a complete head →
    // structural suffixes.
    if (!head) {
      return { from: word.from, options: options(WQL_AGGREGATORS).map((c) => ({ ...c, type: 'keyword' })), validFor: /^[\w-]*$/ };
    }

    // Top level after the head: structural suffixes.
    return {
      from: word.from,
      options: [
        snippetCompletion('by {${dimension}}', { label: 'by {}', detail: 'group by dimensions', type: 'keyword' }),
        snippetCompletion('.rollup(${1}${d|w})', { label: '.rollup()', detail: 'bucket period', type: 'keyword' }),
      ],
      validFor: /^[\w.-]*$/,
    };
  }

  return source;
}

export function wqlCompletion(options?: WqlCompletionOptions): Extension {
  return autocompletion({ override: [wqlCompletionSource(options)] });
}

// ── Language support ───────────────────────────────────────────────

/**
 * Query-field colors, mapped onto the app's theme tokens (src/index.css) so
 * the field follows light/dark mode: aggregator + structural keywords take
 * the primary hue, the metric takes accent, tag keys secondary, values
 * success-green, dimensions warning-ochre.
 */
export const wqlHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: 'hsl(var(--primary))' },
  { tag: t.variableName, color: 'hsl(var(--accent-foreground))', fontWeight: '600' },
  { tag: t.propertyName, color: 'hsl(var(--secondary-foreground))' },
  { tag: t.string, color: 'hsl(var(--success))' },
  { tag: t.attributeName, color: 'hsl(var(--warning))' },
  { tag: t.number, color: 'hsl(var(--primary))' },
  { tag: t.unit, color: 'hsl(var(--muted-foreground))' },
  { tag: t.operator, color: 'hsl(var(--destructive))' },
  { tag: [t.bracket, t.punctuation], color: 'hsl(var(--muted-foreground))' },
]);

export function wql(completionOptions?: WqlCompletionOptions) {
  return new LanguageSupport(wqlLanguage, [
    wqlCompletion(completionOptions),
    syntaxHighlighting(wqlHighlightStyle),
  ]);
}
