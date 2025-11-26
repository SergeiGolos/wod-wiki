/**
 * CardContainer - Main container component that renders the appropriate card
 * 
 * Routes to the correct card component based on card type and display mode.
 */

import React from 'react';
import { 
  InlineWidgetCard, 
  CardCallbacks, 
  HeadingContent,
  BlockquoteContent,
  ImageContent,
  YouTubeContent,
  FrontMatterContent,
  WodBlockContent
} from '../types';
import { HeadingPreview } from './HeadingPreview';
import { BlockquotePreview } from './BlockquotePreview';
import { ImagePreview } from './ImagePreview';
import { YouTubePreview } from './YouTubePreview';
import { FrontMatterCard } from './FrontMatterCard';
import { WodBlockCard } from './WodBlockCard';

interface CardContainerProps {
  card: InlineWidgetCard;
  callbacks: CardCallbacks;
  monaco?: any;
}

export const CardContainer: React.FC<CardContainerProps> = ({ card, callbacks, monaco }) => {
  const renderContent = () => {
    switch (card.cardType) {
      case 'heading':
        return <HeadingPreview card={card as InlineWidgetCard<HeadingContent>} callbacks={callbacks} />;
      
      case 'blockquote':
        return <BlockquotePreview card={card as InlineWidgetCard<BlockquoteContent>} callbacks={callbacks} />;
      
      case 'image':
        return <ImagePreview card={card as InlineWidgetCard<ImageContent>} callbacks={callbacks} />;
      
      case 'youtube':
        return <YouTubePreview card={card as InlineWidgetCard<YouTubeContent>} callbacks={callbacks} />;
      
      case 'frontmatter':
        return <FrontMatterCard card={card as InlineWidgetCard<FrontMatterContent>} callbacks={callbacks} />;
      
      case 'wod-block':
        return <WodBlockCard card={card as InlineWidgetCard<WodBlockContent>} callbacks={callbacks} monaco={monaco} />;
      
      default:
        return null;
    }
  };
  
  // For edit-only mode, don't render anything (Monaco line is shown instead)
  if (card.displayMode === 'edit-only') {
    return null;
  }
  
  return (
    <div 
      className="inline-widget-card w-full"
      data-mode={card.displayMode}
      data-type={card.cardType}
      data-card-id={card.id}
    >
      {renderContent()}
    </div>
  );
};
