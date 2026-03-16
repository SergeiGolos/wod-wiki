/**
 * YouTubeEmbed
 * 
 * Renders a YouTube video embed from front matter properties.
 * Extracts video ID from url/link property and renders an iframe.
 */

import React, { useMemo } from 'react';
import { SECTION_LINE_HEIGHT } from '../../SectionContainer';
import { extractYouTubeVideoId } from '@/lib/youtubeUtils';

export interface YouTubeEmbedProps {
  properties: Record<string, string>;
  lineCount: number;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ properties, lineCount }) => {
  const url = properties['url'] || properties['link'] || '';
  const title = properties['title'] || 'YouTube Video';
  const videoId = useMemo(() => extractYouTubeVideoId(url), [url]);

  const minHeight = lineCount * SECTION_LINE_HEIGHT;

  if (!videoId) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground italic bg-muted/30 rounded"
        style={{ minHeight }}
      >
        Invalid YouTube URL: {url}
      </div>
    );
  }

  return (
    <div className="py-1" style={{ minHeight }}>
      <div className="rounded overflow-hidden border border-border/40 bg-black">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
      {title !== 'YouTube Video' && (
        <div className="mt-1 text-xs text-muted-foreground truncate">{title}</div>
      )}
    </div>
  );
};
