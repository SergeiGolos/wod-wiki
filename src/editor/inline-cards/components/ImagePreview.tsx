/**
 * ImagePreview - Preview component for image cards
 * 
 * Renders the image with an edit button overlay.
 */

import React from 'react';
import { ImageContent, ImageCardProps } from '../types';

export const ImagePreview: React.FC<ImageCardProps> = ({ card, callbacks }) => {
  const content = card.content as ImageContent;
  const { url, alt } = content;
  
  return (
    <div className="image-preview relative group my-2 flex flex-col items-center">
      {/* Edit button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          callbacks.onEdit();
        }}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 bg-background/90 text-foreground px-2 py-1 rounded text-xs border border-border hover:bg-accent transition-opacity shadow-sm"
        title="Edit Markdown"
      >
        Edit
      </button>
      
      {/* Image */}
      <img 
        src={url} 
        alt={alt || 'Image'} 
        className="max-w-full max-h-[400px] h-auto rounded-md shadow-sm border border-border"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement?.insertAdjacentHTML(
            'beforeend', 
            `<span class="text-destructive text-sm p-4">Failed to load image: ${url}</span>`
          );
        }}
      />
      
      {/* Alt text caption */}
      {alt && (
        <span className="text-xs text-muted-foreground mt-1">{alt}</span>
      )}
    </div>
  );
};
