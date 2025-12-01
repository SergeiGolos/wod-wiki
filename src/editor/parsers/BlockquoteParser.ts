import { Range } from 'monaco-editor';
import { InlineWidgetCard, BlockquoteContent } from '../inline-cards/types';
import { CARD_TYPE_CONFIGS } from '../inline-cards/config';
import { ICardParserStrategy } from './ICardParserStrategy';

export class BlockquoteParser implements ICardParserStrategy {
  parse(lines: string[], existingCards: InlineWidgetCard[]): InlineWidgetCard<BlockquoteContent>[] {
    const cards: InlineWidgetCard<BlockquoteContent>[] = [];
    const config = CARD_TYPE_CONFIGS.blockquote;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      if (this.isLineInExistingCard(lineNum, existingCards)) continue;

      const match = line.match(/^>\s+(.*)$/);

      if (match) {
        const text = match[1];
        const prefixLength = 2;

        cards.push({
          id: `blockquote-${lineNum}`,
          cardType: 'blockquote',
          sourceRange: new Range(lineNum, 1, lineNum, line.length + 1),
          content: {
            type: 'blockquote',
            text,
            prefixLength,
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
