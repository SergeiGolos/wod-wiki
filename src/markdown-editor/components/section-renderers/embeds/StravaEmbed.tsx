/**
 * StravaEmbed
 * 
 * Renders a Strava activity link as a styled card with an external link.
 * Strava doesn't provide a simple embed iframe, so we render a branded card
 * with the activity link and metadata from properties.
 */

import React from 'react';
import { SECTION_LINE_HEIGHT } from '../../SectionContainer';
import { ExternalLink } from 'lucide-react';

export interface StravaEmbedProps {
  properties: Record<string, string>;
  lineCount: number;
}

/** Extract Strava activity ID from URL */
function extractActivityId(url: string): string | null {
  const match = url.match(/strava\.com\/activities\/(\d+)/);
  return match ? match[1] : null;
}

export const StravaEmbed: React.FC<StravaEmbedProps> = ({ properties, lineCount }) => {
  const url = properties['url'] || properties['link'] || '';
  const title = properties['title'] || 'Strava Activity';
  const description = properties['description'] || '';
  const activityId = extractActivityId(url);

  const minHeight = lineCount * SECTION_LINE_HEIGHT;

  if (!activityId && !url) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground italic bg-muted/30 rounded"
        style={{ minHeight }}
      >
        No Strava activity URL provided
      </div>
    );
  }

  return (
    <div className="py-1" style={{ minHeight }}>
      <div className="rounded border border-border/40 bg-card overflow-hidden">
        {/* Strava branded header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#FC4C02]/10 border-b border-border/20">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#FC4C02]" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-[#FC4C02] hover:underline"
            >
              View on Strava
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        {/* Activity details */}
        <div className="px-3 py-2 text-sm text-foreground/80">
          {description && <p className="text-xs text-muted-foreground mb-1">{description}</p>}
          {/* Render known metrics */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            {properties['distance'] && <span>Distance: {properties['distance']}</span>}
            {properties['time'] && <span>Time: {properties['time']}</span>}
            {properties['pace'] && <span>Pace: {properties['pace']}</span>}
            {properties['elevation'] && <span>Elevation: {properties['elevation']}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
