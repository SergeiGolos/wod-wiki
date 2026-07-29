import type { PaletteDataSource, PaletteItem } from '@/components/organisms/command-palette/palette-types';

/** A single construct that users can look up from the command palette or home grid. */
export interface ConstructItem {
  id: string;
  label: string;
  /** Searchable tokens (lower-cased during search). */
  terms: string[];
  /** Palette selection navigates here. */
  route: string;
  /** Shown as the result sub-label so users know where they are landing. */
  sublabel: string;
  /** Home Quick Reference grid links here. */
  gridRoute: string;
}

/** Static registry of whiteboard constructs and their reference destinations.
 *
 * Palette routes favor the behaviors family pages where the behavior is the
 * clearest explanation; the home grid always deep-links into the cheat-sheet
 * anchors so the visual listing stays predictable.
 */
export const CONSTRUCT_REGISTRY: ConstructItem[] = [
  {
    id: 'amrap',
    label: 'AMRAP',
    terms: ['amrap'],
    route: '/guide/behaviors/timers',
    sublabel: 'Timer behaviors',
    gridRoute: '/guide/syntax/cheatsheet?h=amrap',
  },
  {
    id: 'emom',
    label: 'EMOM',
    terms: ['emom'],
    route: '/guide/behaviors/timers',
    sublabel: 'Timer behaviors',
    gridRoute: '/guide/syntax/cheatsheet?h=emom',
  },
  {
    id: 'tabata',
    label: 'Tabata',
    terms: ['tabata'],
    route: '/guide/behaviors/timers',
    sublabel: 'Timer behaviors',
    gridRoute: '/guide/syntax/cheatsheet?h=tabata',
  },
  {
    id: 'rest',
    label: 'Rest',
    terms: ['rest', ':*'],
    route: '/guide/behaviors/timers',
    sublabel: 'Timer behaviors',
    gridRoute: '/guide/syntax/cheatsheet?h=rest',
  },
  {
    id: 'duration',
    label: 'Duration',
    terms: ['duration', '5:00'],
    route: '/guide/behaviors/timers',
    sublabel: 'Timer behaviors',
    gridRoute: '/guide/behaviors/timers',
  },
  {
    id: 'ladder',
    label: 'Ladder',
    terms: ['ladder', '21-15-9'],
    route: '/guide/behaviors/rounds',
    sublabel: 'Rounds & structure',
    gridRoute: '/guide/syntax/cheatsheet?h=ladders',
  },
  {
    id: 'rounds',
    label: 'Rounds',
    terms: ['rounds'],
    route: '/guide/syntax/cheatsheet?h=rounds',
    sublabel: 'Cheat sheet',
    gridRoute: '/guide/syntax/cheatsheet?h=rounds',
  },
  {
    id: 'supersets',
    label: 'Supersets',
    terms: ['supersets'],
    route: '/guide/syntax/cheatsheet?h=supersets',
    sublabel: 'Cheat sheet',
    gridRoute: '/guide/syntax/cheatsheet?h=supersets',
  },
  {
    id: 'actual',
    label: 'Actual result',
    terms: ['actual', ':?'],
    route: '/guide/behaviors/capture',
    sublabel: 'Capture & feedback',
    gridRoute: '/guide/syntax/cheatsheet?h=actual',
  },
  {
    id: 'load-prompt',
    label: 'Load prompt',
    terms: ['load prompt', '?lb', '225lb', 'load'],
    route: '/guide/behaviors/capture',
    sublabel: 'Capture & feedback',
    gridRoute: '/guide/syntax/cheatsheet?h=load-prompt',
  },
  {
    id: 'metrics',
    label: 'Metrics',
    terms: ['metrics', 'reps', 'effort', 'discipline'],
    route: '/guide/syntax/cheatsheet?h=metrics',
    sublabel: 'Cheat sheet',
    gridRoute: '/guide/syntax/cheatsheet?h=metrics',
  },
  {
    id: 'palette',
    label: 'Command palette',
    terms: ['palette', '⌘/'],
    route: '/guide/syntax/cheatsheet',
    sublabel: 'Cheat sheet',
    gridRoute: '/guide/syntax/cheatsheet',
  },
];

/** Maps each home-grid cell text to its construct registry entry id. */
export const CONSTRUCT_GRID_MAP: Record<string, string> = {
  '5:00 duration': 'duration',
  '(21-15-9) ladder': 'ladder',
  '225lb load': 'load-prompt',
  'AMRAP': 'amrap',
  'EMOM': 'emom',
  'Tabata': 'tabata',
  ':* rest': 'rest',
  ':? actual': 'actual',
  '?lb prompt': 'load-prompt',
  '⌘/ palette': 'palette',
  'rounds': 'rounds',
  'reps': 'metrics',
  'load': 'metrics',
  'effort': 'metrics',
  'discipline': 'metrics',
};

export const CONSTRUCT_GRID_CELLS = Object.keys(CONSTRUCT_GRID_MAP);

const registryById: Record<string, ConstructItem | undefined> = Object.fromEntries(
  CONSTRUCT_REGISTRY.map((item) => [item.id, item]),
);

/** Resolve a grid cell to its registry item. */
export function getConstructByGridCell(cell: string): ConstructItem | undefined {
  const id = CONSTRUCT_GRID_MAP[cell];
  return id ? registryById[id] : undefined;
}

/** Palette data source backed by the static construct registry. */
export function constructSource(): PaletteDataSource {
  return {
    id: 'constructs',
    label: 'Reference',
    search: (query) => {
      const low = query.toLowerCase().trim();
      if (!low) return [];

      const matches = CONSTRUCT_REGISTRY.filter((item) => {
        const label = item.label.toLowerCase();
        if (label.includes(low) || low.includes(label)) return true;
        return item.terms.some((term) => {
          const t = term.toLowerCase();
          return t.includes(low) || low.includes(t);
        });
      });

      return matches.map(
        (item): PaletteItem => ({
          id: `construct:${item.id}`,
          label: item.label,
          sublabel: item.sublabel,
          category: 'Reference',
          type: 'route',
          payload: { route: item.route },
        }),
      );
    },
  };
}
