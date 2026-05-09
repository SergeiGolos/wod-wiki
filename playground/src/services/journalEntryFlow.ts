/**
 * createJournalEntryFlow — n-step palette chain for "New journal entry".
 *
 * Step tree:
 *
 *   Blank     → create entry immediately
 *   History   → pick past entry → clone its content
 *   Collection → pick collection → pick workout → pick WOD block (if >1)
 *   Feed       → pick recent entry → pick WOD block (if >1)
 *
 * Each step is a plain `await palette.open(...)` call. The palette knows
 * nothing about the chain — the caller drives it entirely.
 */

import React from 'react';
import { usePaletteStore } from '@/components/command-palette/palette-store';
import {
  CREATE_FROM_SOURCE,
  collectionListSource,
  collectionItemsSource,
  wodBlockSource,
  journalHistorySource,
  feedSource,
  extractWodBlocks,
  type ExtractedWodBlock,
} from './paletteDataSources';
import type { WodCollection, WodCollectionItem } from '@/repositories/wod-collections';
import type { PlaygroundPage } from './playgroundDB';

export const JOURNAL_BLANK_TEMPLATE = `# Journal Entry\n\n\`\`\`wod\n\n\`\`\`\n`;

// ── Params ────────────────────────────────────────────────────────────────

export interface JournalEntryFlowParams {
  dateKey: string;
  onCreated: (content: string) => Promise<void> | void;
}

// ── Header builder ────────────────────────────────────────────────────────

/**
 * Breadcrumb header shown inside the palette at each step.
 * `crumbs` is the ordered list of selections made so far.
 */
function stepHeader(dateLabel: string, crumbs: string[]): React.ReactNode {
  return React.createElement(
    'div',
    { className: 'px-4 py-3 bg-primary/5 border-b border-border' },
    React.createElement(
      'p',
      { className: 'text-[10px] font-black uppercase tracking-widest text-primary mb-1' },
      'New journal entry'
    ),
    React.createElement(
      'div',
      { className: 'flex items-center gap-1.5 flex-wrap' },
      [dateLabel, ...crumbs].map((crumb, i) =>
        React.createElement(
          React.Fragment,
          { key: i },
          i > 0 &&
            React.createElement(
              'span',
              { className: 'text-muted-foreground/50 text-xs' },
              '›'
            ),
          React.createElement(
            'span',
            {
              className:
                i === crumbs.length
                  ? 'text-sm font-semibold text-foreground'
                  : 'text-sm text-muted-foreground',
            },
            crumb
          )
        )
      )
    )
  );
}

function formatDateLabel(dateKey: string): string {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── WOD block picker ──────────────────────────────────────────────────────

/**
 * If `markdown` has exactly one WOD block, return it immediately.
 * If it has multiple, ask the user to pick one.
 * Returns null if dismissed or no blocks found.
 */
async function pickWodBlock(
  markdown: string,
  workoutName: string,
  dateLabel: string,
  crumbs: string[]
): Promise<ExtractedWodBlock | null> {
  const blocks = extractWodBlocks(markdown);
  if (blocks.length === 0) return null;
  if (blocks.length === 1) return blocks[0];

  const result = await usePaletteStore.getState().open({
    placeholder: 'Pick a WOD block to clone…',
    header: stepHeader(dateLabel, [...crumbs, workoutName]),
    sources: [wodBlockSource(workoutName, markdown)],
  });

  if (result.dismissed) return null;
  return result.item.payload as ExtractedWodBlock;
}

/** Wrap a WOD block in a new journal entry. */
function blockToEntryContent(workoutName: string, block: ExtractedWodBlock): string {
  return `# ${workoutName}\n\n\`\`\`${block.dialect}\n${block.script}\`\`\`\n`;
}

// ── Collection path ───────────────────────────────────────────────────────

async function runCollectionPath(
  dateLabel: string,
  onCreated: JournalEntryFlowParams['onCreated']
): Promise<void> {
  const palette = usePaletteStore.getState();

  // Step 2: pick a collection
  const collResult = await palette.open({
    placeholder: 'Pick a collection…',
    header: stepHeader(dateLabel, ['Collection']),
    sources: [collectionListSource()],
  });
  if (collResult.dismissed) return;
  const collection = collResult.item.payload as WodCollection;

  // Step 3: pick a workout within the collection
  const workoutResult = await palette.open({
    placeholder: `Search ${collection.name}…`,
    header: stepHeader(dateLabel, ['Collection', collection.name]),
    sources: [collectionItemsSource(collection)],
  });
  if (workoutResult.dismissed) return;
  const workout = workoutResult.item.payload as WodCollectionItem;

  // Step 4: pick a WOD block (auto-selects if only one)
  const block = await pickWodBlock(
    workout.content,
    workout.name,
    dateLabel,
    ['Collection', collection.name]
  );
  if (!block) {
    // No blocks — fall back to whole workout content
    await onCreated(`# ${workout.name}\n\n${workout.content}`);
    return;
  }

  await onCreated(blockToEntryContent(workout.name, block));
}

// ── Feed path ─────────────────────────────────────────────────────────────

async function runFeedPath(
  dateKey: string,
  dateLabel: string,
  onCreated: JournalEntryFlowParams['onCreated']
): Promise<void> {
  const palette = usePaletteStore.getState();

  // Step 2: pick a recent journal entry from the feed
  const entryResult = await palette.open({
    placeholder: 'Pick a recent entry from the feed…',
    header: stepHeader(dateLabel, ['Feed']),
    sources: [feedSource(dateKey)],
  });
  if (entryResult.dismissed) return;
  const page = entryResult.item.payload as PlaygroundPage;

  // Step 3: pick a WOD block from that entry (auto-selects if only one)
  const block = await pickWodBlock(
    page.content,
    page.name,
    dateLabel,
    ['Feed']
  );
  if (!block) {
    // No blocks — clone whole page content
    await onCreated(page.content);
    return;
  }

  await onCreated(blockToEntryContent(page.name, block));
}

// ── History path ──────────────────────────────────────────────────────────

async function runHistoryPath(
  dateKey: string,
  dateLabel: string,
  onCreated: JournalEntryFlowParams['onCreated']
): Promise<void> {
  const palette = usePaletteStore.getState();

  // Step 2: pick a past journal entry
  const entryResult = await palette.open({
    placeholder: 'Search past journal entries…',
    header: stepHeader(dateLabel, ['History']),
    sources: [journalHistorySource(dateKey)],
  });
  if (entryResult.dismissed) return;
  const page = entryResult.item.payload as { content: string } | undefined;

  await onCreated(page?.content ?? JOURNAL_BLANK_TEMPLATE);
}

// ── Main entry point ──────────────────────────────────────────────────────

export async function createJournalEntryFlow({
  dateKey,
  onCreated,
}: JournalEntryFlowParams): Promise<void> {
  const palette = usePaletteStore.getState();
  const dateLabel = formatDateLabel(dateKey);

  // Step 1: pick a mode
  const modeResult = await palette.open({
    placeholder: 'Choose a starting point…',
    header: stepHeader(dateLabel, []),
    sources: [CREATE_FROM_SOURCE],
  });
  if (modeResult.dismissed) return;

  const mode = modeResult.item.payload as string;

  switch (mode) {
    case 'blank':
      await onCreated(JOURNAL_BLANK_TEMPLATE);
      break;

    case 'template':
      // Coming soon — fall back to blank
      await onCreated(JOURNAL_BLANK_TEMPLATE);
      break;

    case 'collection':
      await runCollectionPath(dateLabel, onCreated);
      break;

    case 'feed':
      await runFeedPath(dateKey, dateLabel, onCreated);
      break;

    case 'history':
      await runHistoryPath(dateKey, dateLabel, onCreated);
      break;
  }
}
