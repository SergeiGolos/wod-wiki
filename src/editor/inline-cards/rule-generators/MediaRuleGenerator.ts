/**
 * MediaRuleGenerator - Generates rules for images and YouTube embeds
 * 
 * Media uses full-card rules since they need to display content
 * that doesn't fit in a line overlay format.
 */

import { Range } from 'monaco-editor';
import React from 'react';
import { 
  CardRuleGenerator, 
  ImageContent, 
  YouTubeContent,
  RowRule, 
  FullCardRowRule,
  CardRenderProps,
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
    
    if (content.type === 'image') {
      const fullCardRule: FullCardRowRule = {
        lineNumber,
        overrideType: 'full-card',
        cardType: 'image',
        heightPx: isEditing ? 250 : 300,
        renderCard: (props: CardRenderProps) => {
          return React.createElement(ImageCard, {
            content: content as ImageContent,
            ...props,
          });
        },
      };
      rules.push(fullCardRule);
    } else if (content.type === 'youtube') {
      const fullCardRule: FullCardRowRule = {
        lineNumber,
        overrideType: 'full-card',
        cardType: 'youtube',
        heightPx: isEditing ? 200 : 360,
        renderCard: (props: CardRenderProps) => {
          return React.createElement(YouTubeCard, {
            content: content as YouTubeContent,
            ...props,
          });
        },
      };
      rules.push(fullCardRule);
    }

    return rules;
  }
}

/**
 * Image card component
 */
interface ImageCardProps extends CardRenderProps {
  content: ImageContent;
}

const ImageCard: React.FC<ImageCardProps> = ({
  content,
  displayMode,
  isEditing,
  onEdit,
}) => {
  const { url, alt, rawMarkdown } = content;

  if (displayMode === 'half-screen' || isEditing) {
    // Split view: source on left, image on right
    return React.createElement('div', {
      className: 'image-card-split grid grid-cols-2 h-full border border-border rounded-lg overflow-hidden',
    }, [
      // Left: Source
      React.createElement('div', {
        key: 'source',
        className: 'image-source border-r border-border p-3 flex flex-col',
      }, [
        React.createElement('div', {
          key: 'label',
          className: 'text-xs font-medium text-muted-foreground mb-2',
        }, 'Markdown'),
        React.createElement('code', {
          key: 'code',
          className: 'text-xs font-mono break-all cursor-pointer hover:bg-muted/50 p-2 rounded',
          onClick: () => onEdit(),
        }, rawMarkdown),
      ]),
      // Right: Image
      React.createElement('div', {
        key: 'preview',
        className: 'image-preview flex items-center justify-center p-3 bg-muted/20',
      }, 
        React.createElement('img', {
          src: url,
          alt: alt || 'Image',
          className: 'max-w-full max-h-full object-contain rounded shadow-sm',
        })
      ),
    ]);
  }

  // Full preview mode
  return React.createElement('div', {
    className: 'image-card border border-border rounded-lg overflow-hidden bg-card',
  }, [
    // Header
    React.createElement('div', {
      key: 'header',
      className: 'image-card-header px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2',
    }, [
      React.createElement('span', { key: 'icon', className: 'text-muted-foreground' }, '🖼️'),
      React.createElement('span', { key: 'title', className: 'text-sm font-medium' }, 'Image'),
      alt && React.createElement('span', { 
        key: 'alt', 
        className: 'text-xs text-muted-foreground ml-auto' 
      }, alt),
    ]),
    // Content
    React.createElement('div', {
      key: 'content',
      className: 'image-card-content flex items-center justify-center p-4 bg-muted/10 cursor-pointer',
      onClick: () => onEdit(),
    }, 
      React.createElement('img', {
        src: url,
        alt: alt || 'Image',
        className: 'max-w-full max-h-[250px] object-contain rounded shadow-sm',
      })
    ),
  ]);
};

/**
 * YouTube card component
 */
interface YouTubeCardProps extends CardRenderProps {
  content: YouTubeContent;
}

const YouTubeCard: React.FC<YouTubeCardProps> = ({
  content,
  displayMode,
  isEditing,
  onEdit,
}) => {
  const { embedUrl, videoId, rawUrl } = content;

  if (displayMode === 'half-screen' || isEditing) {
    // Split view
    return React.createElement('div', {
      className: 'youtube-card-split grid grid-cols-2 h-full border border-border rounded-lg overflow-hidden',
    }, [
      // Left: Source
      React.createElement('div', {
        key: 'source',
        className: 'youtube-source border-r border-border p-3 flex flex-col',
      }, [
        React.createElement('div', {
          key: 'label',
          className: 'text-xs font-medium text-muted-foreground mb-2',
        }, 'URL'),
        React.createElement('code', {
          key: 'code',
          className: 'text-xs font-mono break-all cursor-pointer hover:bg-muted/50 p-2 rounded',
          onClick: () => onEdit(),
        }, rawUrl),
      ]),
      // Right: Video
      React.createElement('div', {
        key: 'preview',
        className: 'youtube-preview bg-black',
      }, 
        React.createElement('iframe', {
          src: embedUrl,
          className: 'w-full h-full',
          title: `YouTube video ${videoId}`,
          frameBorder: '0',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowFullScreen: true,
        })
      ),
    ]);
  }

  // Full preview mode
  return React.createElement('div', {
    className: 'youtube-card border border-border rounded-lg overflow-hidden bg-card',
  }, [
    // Header
    React.createElement('div', {
      key: 'header',
      className: 'youtube-card-header px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2',
    }, [
      React.createElement('span', { key: 'icon', className: 'text-red-500' }, '▶'),
      React.createElement('span', { key: 'title', className: 'text-sm font-medium' }, 'YouTube Video'),
      React.createElement('span', { 
        key: 'id', 
        className: 'text-xs text-muted-foreground ml-auto font-mono' 
      }, videoId),
    ]),
    // Content
    React.createElement('div', {
      key: 'content',
      className: 'youtube-card-content aspect-video bg-black cursor-pointer',
      onClick: () => onEdit(),
    }, 
      React.createElement('iframe', {
        src: embedUrl,
        className: 'w-full h-full',
        title: `YouTube video ${videoId}`,
        frameBorder: '0',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        allowFullScreen: true,
      })
    ),
  ]);
};
