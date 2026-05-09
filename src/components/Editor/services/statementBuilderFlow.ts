/**
 * statementBuilderFlow — editor-owned segment loop for Ctrl+.
 *
 * Called from the NoteEditor CodeMirror keymap when the cursor is on a
 * text-type metric (effort/action). Reads the current line from cursor
 * focus state, then opens the palette once per segment in sequence.
 *
 * The palette knows nothing about segments; the loop drives it.
 */

import React from 'react';
import { usePaletteStore } from '@/components/command-palette/palette-store';
import { segmentSource, type SegmentType } from '@/components/command-palette/segmentSources';
import type { CursorFocusState } from '@/components/Editor/extensions/cursor-focus-panel';
import type { EditorView } from '@codemirror/view';

// ── Segment header ────────────────────────────────────────────────────────

function buildSegmentHeader(
  segments: string[],
  activeIndex: number,
  segmentLabels: string[]
): React.ReactNode {
  return React.createElement(
    'div',
    { className: 'flex flex-col border-b border-border' },
    React.createElement(
      'div',
      { className: 'px-4 py-3 bg-primary/5' },
      React.createElement(
        'div',
        { className: 'flex items-center justify-between mb-3' },
        React.createElement(
          'span',
          { className: 'text-[10px] font-black uppercase tracking-widest text-primary' },
          'Statement Builder'
        ),
        React.createElement(
          'span',
          { className: 'text-[10px] font-medium text-primary/60' },
          `Step ${activeIndex + 1} of ${segments.length}`
        )
      ),
      React.createElement(
        'div',
        { className: 'flex flex-wrap gap-1.5 font-mono text-sm' },
        segments.map((seg, i) =>
          React.createElement(
            'div',
            {
              key: i,
              className:
                i === activeIndex
                  ? 'px-2 py-1 rounded-md border bg-primary text-primary-foreground border-primary shadow-md scale-105'
                  : 'px-2 py-1 rounded-md border bg-background text-foreground/60 border-border',
            },
            seg
          )
        )
      )
    ),
    React.createElement(
      'div',
      { className: 'px-4 py-2 bg-muted/30 border-t border-border' },
      React.createElement(
        'span',
        { className: 'text-[10px] font-bold text-muted-foreground uppercase tracking-tight' },
        segmentLabels[activeIndex] ?? 'Value'
      )
    )
  );
}

// ── Main flow ─────────────────────────────────────────────────────────────

const SEGMENT_SEQUENCE: SegmentType[] = ['reps', 'movement', 'weight'];
const SEGMENT_LABELS: Record<SegmentType, string> = {
  reps: 'Repetitions',
  movement: 'Movement',
  weight: 'Load / Intensity',
};

export async function runStatementBuilderFlow(
  focus: CursorFocusState,
  view: EditorView
): Promise<void> {
  const palette = usePaletteStore.getState();

  // Parse the current line into segments (simple whitespace split for now)
  const lineText = view.state.doc.sliceString(focus.lineFrom, focus.lineTo);
  const segments = lineText.trim() ? lineText.trim().split(/\s+/) : ['', '', ''];
  const mutableSegments = [
    segments[0] ?? '',
    segments[1] ?? '',
    segments[2] ?? '',
  ];

  const segmentLabels = SEGMENT_SEQUENCE.map(t => SEGMENT_LABELS[t]);

  for (let i = 0; i < SEGMENT_SEQUENCE.length; i++) {
    const segType = SEGMENT_SEQUENCE[i];

    const result = await palette.open({
      placeholder: `Set ${SEGMENT_LABELS[segType].toLowerCase()}…`,
      header: buildSegmentHeader([...mutableSegments], i, segmentLabels),
      sources: [segmentSource(segType)],
    });

    if (result.dismissed) break;

    mutableSegments[i] = result.item.payload as string;
  }

  // Commit the updated line back to the editor
  const newLine = mutableSegments.filter(Boolean).join(' ');
  if (newLine !== lineText.trim()) {
    view.dispatch({
      changes: { from: focus.lineFrom, to: focus.lineTo, insert: newLine },
    });
  }
}
