/**
 * Planner Page Stories
 *
 * Full-page shell for the plan/editor view — write and structure workouts
 * using the WOD Wiki syntax with live preview and JIT compilation.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PlanPanel } from '@/panels/plan-panel';
import { NoteEditor } from '@/components/Editor/NoteEditor';

const SAMPLE_WORKOUT = `# Fran

\`\`\`wod
(21-15-9)
  Thrusters 95lb
  Pullups
\`\`\`
`;

const AMRAP_WORKOUT = `# AMRAP 20

\`\`\`wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Squats
\`\`\`
`;

const EMPTY_WORKOUT = '';

const PlannerPageShell: React.FC<{ initialContent?: string }> = ({
  initialContent = SAMPLE_WORKOUT,
}) => {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="w-full h-screen bg-background overflow-hidden">
      <PlanPanel
        initialContent={content}
        value={content}
        onStartWorkout={() => {}}
        setBlocks={() => {}}
        setContent={setContent}
      />
    </div>
  );
};

const meta: Meta = {
  title: 'catalog/pages/Planner',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-page planner — write workouts in WOD Wiki syntax with live parsing and block previews.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'LegacyPlanPanel (deprecated)',
  render: () => <PlannerPageShell initialContent={SAMPLE_WORKOUT} />,
};

export const Amrap: StoryObj = {
  name: 'LegacyAmrap (deprecated)',
  render: () => <PlannerPageShell initialContent={AMRAP_WORKOUT} />,
};

export const Empty: StoryObj = {
  name: 'LegacyEmpty (deprecated)',
  render: () => <PlannerPageShell initialContent={EMPTY_WORKOUT} />,
};

// ── NoteEditor — current playground pattern ───────────────────────────────────

const NoteEditorShell: React.FC<{ initialContent?: string }> = ({
  initialContent = SAMPLE_WORKOUT,
}) => {
  const [content, setContent] = useState(initialContent);
  return (
    <div className="w-full h-screen bg-background overflow-hidden">
      <NoteEditor
        value={content}
        onChange={setContent}
        onStartWorkout={() => {}}
        className="h-full w-full"
      />
    </div>
  );
};

export const NoteEditorDefault: StoryObj = {
  name: 'NoteEditor — Fran',
  render: () => <NoteEditorShell initialContent={SAMPLE_WORKOUT} />,
};

export const NoteEditorAmrap: StoryObj = {
  name: 'NoteEditor — AMRAP 20',
  render: () => <NoteEditorShell initialContent={AMRAP_WORKOUT} />,
};

export const NoteEditorEmpty: StoryObj = {
  name: 'NoteEditor — Empty',
  render: () => <NoteEditorShell initialContent={EMPTY_WORKOUT} />,
};
