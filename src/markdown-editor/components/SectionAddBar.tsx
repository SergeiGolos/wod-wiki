/**
 * SectionAddBar
 *
 * A row of buttons displayed at the bottom of the section editor
 * allowing users to insert a new section of a specific type.
 *
 * Section types:
 *  - H1 – H4 headings
 *  - Paragraph (plain text)
 *  - WOD block (also accessible via todo / log / plan aliases)
 *  - YouTube embed (future — currently inserts a wod placeholder)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Heading1, Heading2, Heading3, Heading4,
  AlignLeft, ListTodo, ScrollText, ClipboardList,
  Youtube, Plus,
} from 'lucide-react';

export type NewSectionType =
  | 'h1' | 'h2' | 'h3' | 'h4'
  | 'paragraph'
  | 'wod'
  | 'youtube';

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
  { type: 'h1',        label: 'H1',        icon: <Heading1 className="w-4 h-4" /> },
  { type: 'h2',        label: 'H2',        icon: <Heading2 className="w-4 h-4" /> },
  { type: 'h3',        label: 'H3',        icon: <Heading3 className="w-4 h-4" /> },
  { type: 'h4',        label: 'H4',        icon: <Heading4 className="w-4 h-4" /> },
  { type: 'paragraph', label: 'Paragraph', icon: <AlignLeft className="w-4 h-4" />, group: true },
  { type: 'wod',       label: 'Todo',      icon: <ListTodo className="w-4 h-4" />,  group: true },
  { type: 'wod',       label: 'Log',       icon: <ScrollText className="w-4 h-4" /> },
  { type: 'wod',       label: 'Plan',      icon: <ClipboardList className="w-4 h-4" /> },
  { type: 'youtube',   label: 'YouTube',   icon: <Youtube className="w-4 h-4" />, group: true },
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
