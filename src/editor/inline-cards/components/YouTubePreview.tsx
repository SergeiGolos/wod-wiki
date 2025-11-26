/**
 * YouTubePreview - Preview component for YouTube embed cards
 * 
 * Renders an embedded YouTube video player.
 */

import React from 'react';
import { YouTubeContent, YouTubeCardProps } from '../types';

export const YouTubePreview: React.FC<YouTubeCardProps> = ({ card, callbacks }) => {
  const content = card.content as YouTubeContent;
  const { embedUrl, videoId } = content;
  
  return (
    <div className="youtube-preview relative group my-4 rounded-md overflow-hidden shadow-sm border border-border bg-black max-w-2xl mx-auto">
      {/* Edit button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          callbacks.onEdit();
        }}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 bg-background/90 text-foreground px-2 py-1 rounded text-xs border border-border hover:bg-accent transition-opacity shadow-sm"
        title="Edit URL"
      >
        Edit
      </button>
      
      {/* YouTube iframe */}
      <div className="relative pb-[56.25%] h-0">
        <iframe 
          className="absolute top-0 left-0 w-full h-full"
          src={embedUrl} 
          title={`YouTube video ${videoId}`}
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        />
      </div>
    </div>
  );
};
