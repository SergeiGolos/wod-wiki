import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

/**
 * metricMarkTheme — CSS for the metric mark decorations emitted by
 * `cursorFocusExtension` (@bitcobblers/wod-wiki-ui/extensions).
 *
 * The extension paints one mark per metric over each statement line inside
 * ```` ```time ```` / ```` ```log ```` fences, using `cm-metric-mark
 * cm-metric-<type>` classes. The package ships the decorations but no
 * styling for them — this baseTheme restores the token-colored underlines
 * the pre-cutover extension carried (see cursor-focus-panel.ts in the
 * #968 extraction).
 *
 * Colors ride the `--metric-*` design tokens (HSL triples defined in
 * @bitcobblers/wod-wiki-ui/styles.css) so Mineral/Arctic Frost switch
 * automatically via the `.dark` class — no `&dark` overrides needed.
 */
export const metricMarkTheme: Extension = EditorView.baseTheme({
  '.cm-metric-duration': {
    color: 'hsl(var(--metric-time))',
    borderBottom: '2px solid hsl(var(--metric-time))',
  },
  '.cm-metric-rep': {
    color: 'hsl(var(--metric-rep))',
    borderBottom: '2px solid hsl(var(--metric-rep))',
  },
  '.cm-metric-rounds': {
    color: 'hsl(var(--metric-rounds))',
    borderBottom: '2px solid hsl(var(--metric-rounds))',
  },
  '.cm-metric-distance': {
    color: 'hsl(var(--metric-distance))',
    borderBottom: '2px solid hsl(var(--metric-distance))',
  },
  '.cm-metric-resistance': {
    color: 'hsl(var(--metric-resistance))',
    borderBottom: '2px solid hsl(var(--metric-resistance))',
  },
  '.cm-metric-action': {
    color: 'hsl(var(--metric-action))',
    borderBottom: '2px solid hsl(var(--metric-action))',
  },
});
