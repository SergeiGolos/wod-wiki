import { Range } from 'monaco-editor';
import { InlineWidgetCard, FrontMatterContent } from '../inline-cards/types';
import { CARD_TYPE_CONFIGS } from '../inline-cards/config';
import { FrontMatterParser } from '../frontmatter/FrontMatterParser';
import { ICardParserStrategy } from './ICardParserStrategy';

export class FrontMatterCardParser implements ICardParserStrategy {
  parse(lines: string[], _existingCards: InlineWidgetCard[]): InlineWidgetCard<FrontMatterContent>[] {
    // Front matter is typically at the start, so existing cards check is less critical here,
    // but good practice if we allow multiple frontmatter blocks (uncommon but possible in some specs)
    const cards: InlineWidgetCard<FrontMatterContent>[] = [];
    const blocks = FrontMatterParser.parse(lines);
    const config = CARD_TYPE_CONFIGS.frontmatter;

    for (const block of blocks) {
      const rawLines = lines.slice(block.startLine - 1, block.endLine);
      const rawYaml = rawLines.join('\n');

      const propertyCount = Object.keys(block.properties).length;
      const previewPx = Math.max(config.minHeight, (propertyCount + 1) * 28);

      cards.push({
        id: `frontmatter-${block.startLine}`,
        cardType: 'frontmatter',
        sourceRange: new Range(block.startLine, 1, block.endLine, 1),
        content: {
          type: 'frontmatter',
          properties: block.properties,
          rawYaml,
        },
        displayMode: 'full-preview',
        editBehavior: config.editBehavior,
        heights: {
          previewPx,
          sourceLines: block.endLine - block.startLine + 1,
          cardPx: previewPx,
        },
      });
    }

    return cards;
  }
}
