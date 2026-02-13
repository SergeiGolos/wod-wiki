/**
 * SectionAddBar
 *
 * A row of buttons displayed at the bottom of the section editor
 * allowing users to insert a new section of a specific type.
 *
 * Each button adds a NEW section to the note (not a line to the current section).
 *
 * Section types:
 *  - Markdown (free-form text/headings)
 *  - WOD  (```wod dialect)
 *  - Log  (```log dialect)
 *  - Plan (```plan dialect)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  AlignLeft, ListTodo, ScrollText, ClipboardList,
  Plus,
} from 'lucide-react';

export type NewSectionType =
  | 'markdown'
  | 'wod'
  | 'log'
  | 'plan';

export interface SectionAddBarProps {
  /** Called when the user picks a section type to add */
  onAdd: (type: NewSectionType) => void;
  /** Additional CSS classes */
  className?: string;
}

interface ButtonDef {
  type: NewSectionType;
  label: string;
  icon: React.ReactNode;
  /** Optional group separator before this button */
  group?: boolean;
}

const BUTTONS: ButtonDef[] = [
  { type: 'markdown',  label: 'Text',  icon: <AlignLeft className="w-4 h-4" /> },
  { type: 'wod',       label: 'WOD',   icon: <ListTodo className="w-4 h-4" />,       group: true },
  { type: 'log',       label: 'Log',   icon: <ScrollText className="w-4 h-4" /> },
  { type: 'plan',      label: 'Plan',  icon: <ClipboardList className="w-4 h-4" /> },
];

export const SectionAddBar: React.FC<SectionAddBarProps> = ({ onAdd, className }) => {
  return (
    <div
      className={cn(
        'flex items-center gap-1 px-4 py-3 border-t border-border/40',
        'text-muted-foreground',
        className,
      )}
    >
      <Plus className="w-4 h-4 mr-1 opacity-50" />
      <span className="text-xs mr-2 opacity-60 select-none">Add section</span>
      {BUTTONS.map((btn, i) => (
        <React.Fragment key={`${btn.label}-${i}`}>
          {btn.group && i > 0 && (
            <span className="w-px h-5 bg-border/60 mx-1" />
          )}
          <button
            type="button"
            onClick={() => onAdd(btn.type)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded text-xs',
              'hover:bg-accent hover:text-accent-foreground',
              'transition-colors cursor-pointer select-none',
            )}
            title={`Add ${btn.label}`}
          >
            {btn.icon}
            <span>{btn.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
