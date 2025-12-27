/**
 * CardHeader - Header decoration for cards
 * 
 * Compact header that replaces marker lines (```wod, ---, etc.)
 */

import React from 'react';
import { CardType } from '../row-types';
import { Timer, FileText, Image, Youtube, Quote } from 'lucide-react';

interface CardHeaderProps {
  cardType: CardType;
  title?: string;
  icon?: string;
  className?: string;
}

const CARD_ICONS: Record<CardType, React.ElementType> = {
  'wod-block': Timer,
  'frontmatter': FileText,
  'image': Image,
  'youtube': Youtube,
  'heading': FileText,
  'blockquote': Quote,
};

const CARD_COLORS: Record<CardType, string> = {
  'wod-block': 'from-blue-500/20 to-transparent border-blue-500/30',
  'frontmatter': 'from-amber-500/20 to-transparent border-amber-500/30',
  'image': 'from-green-500/20 to-transparent border-green-500/30',
  'youtube': 'from-red-500/20 to-transparent border-red-500/30',
  'heading': 'from-purple-500/20 to-transparent border-purple-500/30',
  'blockquote': 'from-gray-500/20 to-transparent border-gray-500/30',
};

const CARD_TITLES: Record<CardType, string> = {
  'wod-block': 'Workout',
  'frontmatter': 'Document Properties',
  'image': 'Image',
  'youtube': 'Video',
  'heading': 'Heading',
  'blockquote': 'Quote',
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  cardType,
  title,
  icon: _icon,
  className = '',
}) => {
  const IconComponent = CARD_ICONS[cardType] || FileText;
  const colorClass = CARD_COLORS[cardType] || CARD_COLORS.heading;
  const displayTitle = title || CARD_TITLES[cardType] || cardType;

  return (
    <div 
      className={`
        card-header 
        flex items-center gap-2 
        px-3 py-1.5 
        bg-gradient-to-r ${colorClass}
        border-t border-l border-r border-border 
        rounded-t-lg
        ${className}
      `}
    >
      <IconComponent className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">{displayTitle}</span>
    </div>
  );
};
