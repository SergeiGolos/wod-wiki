import { Range } from 'monaco-editor';
import { InlineWidgetCard, ImageContent, YouTubeContent } from '../inline-cards/types';
import { CARD_TYPE_CONFIGS } from '../inline-cards/config';
import { MediaParser } from '../media/MediaParser';
import { ICardParserStrategy } from './ICardParserStrategy';

export class MediaCardParser implements ICardParserStrategy {
  parse(lines: string[], existingCards: InlineWidgetCard[]): InlineWidgetCard<ImageContent | YouTubeContent>[] {
    const cards: InlineWidgetCard<ImageContent | YouTubeContent>[] = [];
    const mediaBlocks = MediaParser.parse(lines);

    for (const block of mediaBlocks) {
      if (this.isLineInExistingCard(block.line, existingCards)) continue;

      if (!block.isWholeLine) continue;

      const lineContent = lines[block.line - 1];

      if (block.type === 'image') {
        const config = CARD_TYPE_CONFIGS.image;
        cards.push({
          id: `image-${block.line}`,
          cardType: 'image',
          sourceRange: new Range(block.line, 1, block.line, lineContent.length + 1),
          content: {
            type: 'image',
            url: block.url,
            alt: block.alt || '',
            rawMarkdown: lineContent,
          },
          displayMode: 'full-preview',
          editBehavior: config.editBehavior,
          heights: {
            previewPx: config.defaultPreviewHeight,
            sourceLines: 1,
            cardPx: config.defaultPreviewHeight,
          },
        });
      } else if (block.type === 'youtube') {
        const config = CARD_TYPE_CONFIGS.youtube;
        const videoIdMatch = block.url.match(/embed\/([a-zA-Z0-9_-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : '';

        cards.push({
          id: `youtube-${block.line}`,
          cardType: 'youtube',
          sourceRange: new Range(block.line, 1, block.line, lineContent.length + 1),
          content: {
            type: 'youtube',
            videoId,
            embedUrl: block.url,
            rawUrl: lineContent.trim(),
          },
          displayMode: 'full-preview',
          editBehavior: config.editBehavior,
          heights: {
            previewPx: config.defaultPreviewHeight,
            sourceLines: 1,
            cardPx: config.defaultPreviewHeight,
          },
        });
      }
    }

    return cards;
  }

  private isLineInExistingCard(lineNum: number, existingCards: InlineWidgetCard[]): boolean {
    return existingCards.some(card =>
      lineNum >= card.sourceRange.startLineNumber &&
      lineNum <= card.sourceRange.endLineNumber
    );
  }
}
