/**
 * createJournalEntryFlow — drives the "new journal entry" n-step palette chain.
 *
 * Step sequence:
 *   1. Pick a mode  (Blank | Collection | History)
 *   2. [if Collection] Pick a workout item from the library
 *   3. [if History]    Pick a past journal entry
 *
 * The caller receives the final content string and is responsible for
 * persisting the entry and navigating to it.
 *
 * Usage:
 *   await createJournalEntryFlow({ dateKey, workoutItems, onCreated });
 */

import React from 'react';
import { usePaletteStore } from '@/components/command-palette/palette-store';
import {
  CREATE_FROM_SOURCE,
  collectionSource,
  journalHistorySource,
  type WorkoutItem,
} from './paletteDataSources';

export const JOURNAL_BLANK_TEMPLATE = `# Journal Entry\n\n\`\`\`wod\n\n\`\`\`\n`;

export interface JournalEntryFlowParams {
  dateKey: string;
  workoutItems: WorkoutItem[];
  onCreated: (content: string) => Promise<void> | void;
}

function formatDateLabel(dateKey: string): string {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function createJournalEntryFlow({
  dateKey,
  workoutItems,
  onCreated,
}: JournalEntryFlowParams): Promise<void> {
  const palette = usePaletteStore.getState();
  const dateLabel = formatDateLabel(dateKey);

  // ── Step 1: pick a mode ─────────────────────────────────────────────────
  const modeResult = await palette.open({
    placeholder: 'Choose a starting point…',
    header: React.createElement(
      'div',
      { className: 'px-4 py-3 bg-primary/5 border-b border-border' },
      React.createElement(
        'p',
        { className: 'text-[10px] font-black uppercase tracking-widest text-primary' },
        'New journal entry'
      ),
      React.createElement(
        'p',
        { className: 'text-sm font-semibold text-foreground mt-0.5' },
        dateLabel
      )
    ),
    sources: [CREATE_FROM_SOURCE],
  });

  if (modeResult.dismissed) return;

  const mode = modeResult.item.payload as string;

  if (mode === 'blank') {
    await onCreated(JOURNAL_BLANK_TEMPLATE);
    return;
  }

  if (mode === 'template') {
    // Coming soon — fall back to blank for now
    await onCreated(JOURNAL_BLANK_TEMPLATE);
    return;
  }

  // ── Step 2a: pick a workout from a collection ────────────────────────────
  if (mode === 'collection') {
    const itemResult = await palette.open({
      placeholder: 'Pick a workout from the library…',
      header: React.createElement(
        'div',
        { className: 'px-4 py-2 bg-muted/30 border-b border-border' },
        React.createElement(
          'span',
          { className: 'text-[10px] font-semibold text-muted-foreground uppercase tracking-tight' },
          `New entry · ${dateLabel} · Collection`
        )
      ),
      sources: [collectionSource('', workoutItems)],
    });

    if (itemResult.dismissed) return;

    const workout = itemResult.item.payload as WorkoutItem;
    const content = workout.content
      ? `# ${workout.name}\n\n${workout.content}`
      : JOURNAL_BLANK_TEMPLATE;
    await onCreated(content);
    return;
  }

  // ── Step 2b: pick a past journal entry ───────────────────────────────────
  if (mode === 'history') {
    const entryResult = await palette.open({
      placeholder: 'Search past journal entries…',
      header: React.createElement(
        'div',
        { className: 'px-4 py-2 bg-muted/30 border-b border-border' },
        React.createElement(
          'span',
          { className: 'text-[10px] font-semibold text-muted-foreground uppercase tracking-tight' },
          `New entry · ${dateLabel} · History`
        )
      ),
      sources: [journalHistorySource(dateKey)],
    });

    if (entryResult.dismissed) return;

    const page = entryResult.item.payload as { content: string } | undefined;
    await onCreated(page?.content ?? JOURNAL_BLANK_TEMPLATE);
    return;
  }
}
