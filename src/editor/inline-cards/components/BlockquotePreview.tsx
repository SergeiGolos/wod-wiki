/**
 * BlockquotePreview - Preview component for blockquote cards
 * 
 * Renders blockquote text with a styled left border.
 */

import React from 'react';
import { BlockquoteContent, BlockquoteCardProps } from '../types';

export const BlockquotePreview: React.FC<BlockquoteCardProps> = ({ card, callbacks }) => {
  const content = card.content as BlockquoteContent;
  const { text } = content;
  
  return (
    <div 
      className="blockquote-preview px-4 py-2 border-l-4 border-primary bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors rounded-r"
      onClick={callbacks.onEdit}
      title="Click to edit"
    >
      <p className="text-muted-foreground italic">{text}</p>
    </div>
  );
};
