/**
 * MediaRuleGenerator - Generates rules for images and YouTube embeds
 * 
 * Behavior per Monaco Card Behavior Spec:
 * - Preview mode (cursor outside): 
 *   - Source line visible but dimmed
 *   - ViewZone below shows rendered media
 * 
 * - Edit mode (cursor on line):
 *   - Raw markdown visible, no preview ViewZone
 */

import { Range } from 'monaco-editor';
import React from 'react';
import { 
  CardRuleGenerator, 
  ImageContent, 
  YouTubeContent,
  RowRule, 
  StyledRowRule,
  ViewZoneRule,
  CardType,
} from '../row-types';

// Combined content type for media
type MediaContent = ImageContent | YouTubeContent;

export class MediaRuleGenerator implements CardRuleGenerator<MediaContent> {
  cardType = 'image' as CardType; // Default, will be set per content

  generateRules(
    content: MediaContent,
    sourceRange: Range,
    isEditing: boolean
  ): RowRule[] {
    const rules: RowRule[] = [];
    const lineNumber = sourceRange.startLineNumber;
    
    if (isEditing) {
      // Edit mode: Just show raw line with subtle styling
      const styledRule: StyledRowRule = {
        lineNumber,
        overrideType: 'styled',
        className: 'media-source-line-editing',
        decoration: {
          isWholeLine: true,
          inlineClassName: 'media-source-text-editing',
        },
      };
      rules.push(styledRule);
      return rules;
    }

    // Preview mode: Dimmed source line + ViewZone below with media preview
    
    // 1. Style the markdown line (visible but dimmed)
    const styledRule: StyledRowRule = {
      lineNumber,
      overrideType: 'styled',
      className: 'media-source-line',
      decoration: {
        isWholeLine: true,
        inlineClassName: 'media-source-text',
      },
    };
    rules.push(styledRule);

    // 2. ViewZone below for media preview
    if (content.type === 'image') {
      const viewZoneRule: ViewZoneRule = {
        lineNumber,
        overrideType: 'view-zone',
        cardType: 'image',
        zonePosition: 'footer', // Appears below the line
        heightInPx: 250, // Default height, could be dynamic
        className: 'media-preview-zone image-preview-zone',
        title: content.alt || 'Image',
        icon: 'image',
        renderContent: () => React.createElement(ImagePreview, { 
          url: content.url, 
          alt: content.alt 
        }),
      };
      rules.push(viewZoneRule);
    } else if (content.type === 'youtube') {
      const viewZoneRule: ViewZoneRule = {
        lineNumber,
        overrideType: 'view-zone',
        cardType: 'youtube',
        zonePosition: 'footer', // Appears below the line
        heightInPx: 315, // 16:9 aspect ratio
        className: 'media-preview-zone youtube-preview-zone',
        title: 'Video',
        icon: 'play',
        renderContent: () => React.createElement(YouTubePreview, { 
          embedUrl: content.embedUrl,
          videoId: content.videoId,
        }),
      };
      rules.push(viewZoneRule);
    }

    return rules;
  }
}

/**
 * Image Preview Component
 */
interface ImagePreviewProps {
  url: string;
  alt: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ url, alt }) => {
  return React.createElement('div', {
    className: 'media-preview-container flex items-center justify-center p-4 bg-muted/10',
  }, 
    React.createElement('img', {
      src: url,
      alt: alt || 'Image',
      className: 'max-w-full max-h-[220px] object-contain rounded shadow-sm',
      onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.style.display = 'none';
        e.currentTarget.parentElement?.classList.add('image-load-error');
      },
    })
  );
};

/**
 * YouTube Preview Component
 */
interface YouTubePreviewProps {
  embedUrl: string;
  videoId: string;
}

const YouTubePreview: React.FC<YouTubePreviewProps> = ({ embedUrl, videoId }) => {
  return React.createElement('div', {
    className: 'media-preview-container w-full h-full bg-black',
  }, 
    React.createElement('iframe', {
      src: embedUrl,
      className: 'w-full h-full',
      title: `YouTube video ${videoId}`,
      frameBorder: '0',
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      allowFullScreen: true,
    })
  );
};
