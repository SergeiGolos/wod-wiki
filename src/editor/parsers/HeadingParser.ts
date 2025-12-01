import { Range } from 'monaco-editor';
import { InlineWidgetCard, HeadingContent } from '../inline-cards/types';
import { CARD_TYPE_CONFIGS } from '../inline-cards/config';
import { ICardParserStrategy } from './ICardParserStrategy';

export class HeadingParser implements ICardParserStrategy {
  parse(lines: string[], existingCards: InlineWidgetCard[]): InlineWidgetCard<HeadingContent>[] {
    const cards: InlineWidgetCard<HeadingContent>[] = [];
    const config = CARD_TYPE_CONFIGS.heading;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      if (this.isLineInExistingCard(lineNum, existingCards)) continue;

      const match = line.match(/^(#{1,6})\s+(.+)$/);

      if (match) {
        const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
        const text = match[2].trim();
        const prefixLength = match[1].length + 1;

        const previewPx = level === 1 ? 40 : level === 2 ? 36 : 32;

        cards.push({
          id: `heading-${lineNum}`,
          cardType: 'heading',
          sourceRange: new Range(lineNum, 1, lineNum, line.length + 1),
          content: {
            type: 'heading',
            level,
            text,
            prefixLength,
          },
          displayMode: 'full-preview',
          editBehavior: config.editBehavior,
          heights: {
            previewPx,
            sourceLines: 1,
            cardPx: previewPx,
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
