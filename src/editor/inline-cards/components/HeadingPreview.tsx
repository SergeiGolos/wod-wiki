/**
 * HeadingPreview - Preview component for heading cards
 * 
 * Renders the heading text with appropriate styling based on level.
 * In edit-only mode when cursor is on the line.
 */

import React from 'react';
import { HeadingContent, HeadingCardProps } from '../types';

export const HeadingPreview: React.FC<HeadingCardProps> = ({ card, callbacks }) => {
  const content = card.content as HeadingContent;
  const { level, text } = content;
  
  const levelStyles: Record<number, string> = {
    1: 'text-2xl font-bold',
    2: 'text-xl font-bold',
    3: 'text-lg font-semibold',
    4: 'text-base font-semibold',
    5: 'text-sm font-semibold',
    6: 'text-sm font-medium',
  };
  
  return (
    <div 
      className={`heading-preview px-2 py-1 cursor-pointer hover:bg-muted/30 transition-colors rounded ${levelStyles[level]}`}
      data-level={level}
      onClick={callbacks.onEdit}
      title="Click to edit"
    >
      {text}
    </div>
  );
};
