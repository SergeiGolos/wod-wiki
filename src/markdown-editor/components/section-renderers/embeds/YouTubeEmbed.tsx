/**
 * YouTubeEmbed
 * 
 * Renders a YouTube video embed from front matter properties.
 * Extracts video ID from url/link property and renders an iframe.
 */

import React, { useMemo } from 'react';
import { SECTION_LINE_HEIGHT } from '../../SectionContainer';

export interface YouTubeEmbedProps {
  properties: Record<string, string>;
  lineCount: number;
}

/** Extract YouTube video ID from various URL formats */
function extractVideoId(url: string): string | null {
  // Standard: https://www.youtube.com/watch?v=VIDEO_ID
  const standardMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (standardMatch) return standardMatch[1];

  // Short: https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Embed: https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ properties, lineCount }) => {
  const url = properties['url'] || properties['link'] || '';
  const title = properties['title'] || 'YouTube Video';
  const videoId = useMemo(() => extractVideoId(url), [url]);

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
