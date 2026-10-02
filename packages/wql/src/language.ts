/**
 * WQL language support — CodeMirror highlighting + autocomplete over the
 * Lezer grammar (grammar/wql.grammar).
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
import { autocompletion, CompletionContext, CompletionResult, Completion, snippetCompletion, startCompletion } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { styleTags, tags as t } from "@lezer/highlight";
import type { SyntaxNode } from "@lezer/common";
import { parser } from "./grammar/wql.parser";
import type { IFieldCatalog } from "./catalog";
import { EFFORT_DISCIPLINES } from "./disciplines";
import {
  WQL_AGGREGATORS,
  WQL_METRIC_FAMILIES,
  WQL_METRIC_AGGREGATES,
  WQL_TAG_KEYS,
  WQL_VIRTUAL_DIMS,
  WQL_CALC_TARGETS,
  WQL_INTENSITY_TIERS,
  WQL_GRAINS,
  WQL_ROLLUP_PERIODS,
  WQL_SOURCE_VALUES,
  WQL_FIND_TARGETS,
} from "./vocabulary";

// The vocabulary tables live in ./vocabulary (no editor deps); re-export
// so existing importers of language keep working.
export {
  WQL_METRIC_FAMILIES,
  WQL_METRIC_AGGREGATES,
  WQL_TAG_KEYS,
  WQL_VIRTUAL_DIMS,
  WQL_CALC_TARGETS,
  WQL_FIND_TARGETS,
  WQL_RESULT_PLANES,
  WQL_SOURCE_VALUES,
  WQL_CONTENT_FILTER_KEYS,
  WQL_AGGREGATORS,
  WQL_COMPARISON_OPS,
  WQL_ROLLUP_PERIODS,
} from "./vocabulary";

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
        "TagValue/Value/Word": t.string,
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
  /**
   * Dynamic values for the frontmatter typed-tag filters (`{domain:…}`,
   * `{format:…}`, `{equipment:…}`, `{quality:…}`, `{intent:…}`) — fed from
   * the tags store's `by-type` index:
   * `async key => (await storage.getAllFromIndex('tags', 'by-type', key)).map(t => t.label)`.
   * Absent or empty results fall through to catalog discovery.
   */
  tagTypeValues?: (key: string) => Promise<readonly string[]> | readonly string[];
  /**
   * Host-supplied values for a filter key (e.g. the composer's suggestion
   * feeds). Non-empty results win over the static vocabularies below.
   */
  values?: (key: string) => Promise<readonly Completion[]>;
  /**
   * Injected field catalog (ticket 15): discovered typed variants join the
   * static metric vocabulary, and categorical values back filter-value
   * suggestions for discovered fields. Bounded prefix lookups only — the
   * catalog never scans event/result history.
   */
  catalog?: IFieldCatalog;
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

/**
 * Accepting a head aggregator or a filter key also writes its separator and
 * reopens the list, so the next slot (metric/target, filter value) is
 * offered immediately — typing becomes picking.
 */
function chained(list: readonly Completion[], suffix: string): Completion[] {
  return list.map((c) => ({
    ...c,
    apply: (view: EditorView, _c: Completion, from: number, to: number) => {
      const text = typeof c.apply === 'string' ? c.apply : c.label;
      const present = view.state.sliceDoc(to, to + suffix.length) === suffix;
      view.dispatch({
        changes: { from, to, insert: present ? text : text + suffix },
        selection: { anchor: from + text.length + suffix.length },
        userEvent: 'input.complete',
      });
      startCompletion(view);
    },
  }));
}

const AGGREGATOR_OPTIONS: Completion[] = [
  { label: 'find', detail: 'content query', type: 'keyword' },
  ...WQL_AGGREGATORS.map((label) => ({ label, type: 'keyword' })),
];

export function wqlCompletionSource(options_: WqlCompletionOptions = {}) {
  const { effortNames, tagTypeValues, catalog, values: hostValues } = options_;

  /** Discovered typed variants for the typed metric word — bounded lookup. */
  const catalogMetricOptions = async (typed: string): Promise<Completion[]> => {
    if (!catalog) return [];
    const entries = await catalog.listByPrefix(typed, 20);
    return entries.map((entry) => ({
      label: entry.path,
      detail: [entry.kind, ...entry.units].filter(Boolean).join(' · '),
      type: 'variable',
      apply: entry.path,
    }));
  };

  /** Categorical values for a discovered field key (original spellings). */
  const catalogValueOptions = async (key: string, typed: string): Promise<Completion[]> => {
    if (!catalog) return [];
    const values = await catalog.listValues(key, typed, 20);
    return values.map((v) => ({ label: v.value, type: 'constant' }));
  };

  /** Discovered categorical field paths as dim/filter keys (ticket 15) —
  *  custom dims are first-class in WQL, so discovered fields complete
  *  alongside the structural tag keys. */
  const catalogKeyOptions = async (): Promise<Completion[]> => {
    if (!catalog) return [];
    const entries = await catalog.listByPrefix('', 20);
    return entries.map((entry) => ({ label: entry.path, detail: entry.kind, type: 'property' }));
  };

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

  const tagValueOptions = (key: string): Completion[] | Promise<Completion[] | null> | null => {
    switch (key) {
      case 'effort': return options(effortNames?.() ?? []);
      case 'discipline': return options(EFFORT_DISCIPLINES);
      case 'intensity': return options(WQL_INTENSITY_TIERS);
      case 'grain': return options(WQL_GRAINS);
      case 'metric': return metricOptions();
      case 'source': return options(WQL_SOURCE_VALUES);
      case 'domain':
      case 'format':
      case 'equipment':
      case 'quality':
      case 'intent': {
        if (!tagTypeValues) return null;
        return Promise.resolve(tagTypeValues(key)).then((values) => (values.length ? options(values) : null));
      }
      default: return null; // note/page/block/result/tags — free-form
    }
  };
  function staticValues(key: string, word: { from: number }, context: CompletionContext): CompletionResult | Promise<CompletionResult | null> | null {
    const valueOptions = tagValueOptions(key);
    if (valueOptions) {
      if (valueOptions instanceof Promise) {
        return valueOptions.then((resolved) => (
          resolved ? { from: word.from, options: resolved, validFor: /^[\w*-]*$/ } : null
        ));
      }
      return { from: word.from, options: valueOptions, validFor: /^[\w*-]*$/ };
    }
    // Discovered categorical fields back filter-value suggestions
    // (original spellings — ticket 15).
    if (catalog) {
      const typed = context.state.sliceDoc(word.from, context.pos);
      return catalogValueOptions(key, typed).then((opts) => (
        opts.length ? { from: word.from, options: opts, validFor: /^[\w*-]*$/ } : null
      ));
    }
    return null;
  }

  function inner(context: CompletionContext): CompletionResult | Promise<CompletionResult | null> | null {
    const word = context.matchBefore(/[\w.*-]*/)!;
    // Structural characters open the next slot immediately, no keystroke needed.
    const opens = word.from > 0 && /[{,:|(]/.test(context.state.sliceDoc(word.from - 1, word.from));
    if (!word || (word.from === word.to && !context.explicit && !opens)) return null;
    const tree = syntaxTree(context.state);
    const node = tree.resolveInner(context.pos, -1);

    // Inside a Filter: before the colon → tag keys; after → values for that key.
    const filter = ancestor(node, 'Filter');
    if (filter) {
      const filterText = context.state.sliceDoc(filter.from, context.pos);
      const colonIndex = filterText.indexOf(':');
      if (colonIndex === -1) {
        const keyWord = context.matchBefore(/[\w-]*/)!;
        return {
          from: keyWord.from,
          options: chained(options(WQL_TAG_KEYS).map((c) => ({ ...c, type: 'property' })), ':'),
          validFor: /^[\w-]*$/,
          ...({ fetchEntries: catalogKeyOptions } as Record<string, unknown>),
        };
      }
      const key = filterText.slice(0, colonIndex).replace(/^!/, '').trim();
      if (hostValues) {
        return hostValues(key).then((items) => (
          items.length ? { from: word.from, options: [...items], validFor: /^[\w*-]*$/ } : staticValues(key, word, context)
        ));
      }
      return staticValues(key, word, context);
    }

    // Inside Filters braces but not in a parsed Filter yet (e.g. `{` + cursor).
    if (ancestor(node, 'Filters')) {
      const keyWord = context.matchBefore(/[\w-]*/)!;
      return {
        from: keyWord.from,
        options: chained(options(WQL_TAG_KEYS).map((c) => ({ ...c, type: 'property' })), ':'),
        validFor: /^[\w-]*$/,
        ...({ fetchEntries: catalogKeyOptions } as Record<string, unknown>),
      };
    }

    // Inside GroupBy: virtual dims + tag keys + discovered custom dims.
    if (ancestor(node, 'GroupBy')) {
      const dimWord = context.matchBefore(/[\w-]*/)!;
      return {
        from: dimWord.from,
        options: [
          ...options(WQL_VIRTUAL_DIMS).map((c) => ({ ...c, type: 'atom' })),
          ...options(WQL_TAG_KEYS).map((c) => ({ ...c, type: 'property' })),
        ],
        validFor: /^[\w-]*$/,
        ...({ fetchEntries: catalogKeyOptions } as Record<string, unknown>),
      };
    }

    // Head-relative positions. The top node's Head child tells whether the
    // query already has a complete head; node ancestry tells whether the
    // cursor sits inside it.
    const head = tree.topNode.getChild('Head');
    const insideHead = ancestor(node, 'Head') !== null;
    const inMetric = node.name === 'Metric' || (node.name === 'Word' && node.parent?.name === 'Metric');

    if (inMetric) {
      if (head && context.state.sliceDoc(head.from, head.to).trimStart().startsWith('find:')) {
        return { from: word.from, options: options(WQL_FIND_TARGETS), validFor: /^[\w.-]*$/ };
      }
      // Discovered typed variants join the static vocabulary (ticket 15) —
      // the bounded catalog lookup merges with the static option list.
      if (catalog) {
        const typed = context.state.sliceDoc(word.from, context.pos);
        return catalogMetricOptions(typed).then((extra) => ({
          from: word.from,
          options: [...metricOptions(), ...extra],
          validFor: /^[\w.-]*$/,
        }));
      }
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
        const find = context.state.sliceDoc(head.from, context.pos).trimStart().startsWith('find:');
        return { from: word.from, options: find ? options(WQL_FIND_TARGETS) : metricOptions(), validFor: /^[\w.-]*$/ };
      }
      if (!afterColon) {
        return { from: word.from, options: chained(AGGREGATOR_OPTIONS, ':'), validFor: /^[\w-]*$/ };
      }
    }

    // Inside .rollup(…): period sizes.
    if (ancestor(node, 'Rollup')) {
      return {
        from: word.from,
        options: options(WQL_ROLLUP_PERIODS).map((c) => ({ ...c, type: 'constant' })),
        validFor: /^[\w]*$/,
      };
    }

    // Query start — no head yet → aggregators. Past a complete head →
    // structural suffixes.
    if (!head) {
      return { from: word.from, options: chained(AGGREGATOR_OPTIONS, ':'), validFor: /^[\w-]*$/ };
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

  /** A non-empty selection means "replace this token": offer every option for
   *  the slot (unfiltered) over the selected range. */
  function source(context: CompletionContext): CompletionResult | Promise<CompletionResult | null> | null {
    const selection = context.state.selection.main;
    if (selection.empty) return inner(context);
    // Evaluate at the selection end so the slot resolved is the selected token's.
    const result = inner(new CompletionContext(context.state, selection.to, true));
    const widen = (r: CompletionResult | null) => r && { ...r, from: selection.from, to: selection.to, filter: false, validFor: undefined };
    return result instanceof Promise ? result.then(widen) : widen(result);
  }

  return source;
}

export function wqlCompletion(options?: WqlCompletionOptions): Extension {
  return autocompletion({ override: [wqlCompletionSource(options)] });
}

// ── Language support ───────────────────────────────────────────────

/**
 * Query-field colors, mapped onto the app's theme tokens so
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
