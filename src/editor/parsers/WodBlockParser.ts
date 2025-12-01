import { Range } from 'monaco-editor';
import { InlineWidgetCard, WodBlockContent } from '../inline-cards/types';
import { CARD_TYPE_CONFIGS } from '../inline-cards/config';
import { MdTimerRuntime } from '../../parser/md-timer';
import { ICodeStatement } from '../../core/types/core';
import { ICardParserStrategy } from './ICardParserStrategy';

const wodParser = new MdTimerRuntime();

export class WodBlockParser implements ICardParserStrategy {
  parse(lines: string[], _existingCards: InlineWidgetCard[]): InlineWidgetCard<WodBlockContent>[] {
    const cards: InlineWidgetCard<WodBlockContent>[] = [];
    const config = CARD_TYPE_CONFIGS['wod-block'] || CARD_TYPE_CONFIGS.frontmatter;

    let inBlock = false;
    let blockStart = -1;
    let blockContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim().toLowerCase();
      const lineNum = i + 1;

      if (!inBlock && trimmedLine.startsWith('```wod')) {
        inBlock = true;
        blockStart = lineNum;
        blockContent = [];
      } else if (inBlock && line.trim().startsWith('```')) {
        const blockEnd = lineNum;
        const rawContent = blockContent.join('\n');

        let statements: ICodeStatement[] = [];
        let parseState: 'pending' | 'parsed' | 'error' = 'pending';

        try {
          const script = wodParser.read(rawContent);
          statements = script.statements;

          if (script.errors && script.errors.length > 0) {
            parseState = 'error';
          } else {
            parseState = 'parsed';
          }
        } catch (err) {
          parseState = 'error';
        }

        const previewPx = Math.max(100, (blockEnd - blockStart + 1) * 22);

        cards.push({
          id: `wod-block-${blockStart}`,
          cardType: 'wod-block',
          sourceRange: new Range(blockStart, 1, blockEnd, lines[blockEnd - 1].length + 1),
          content: {
            type: 'wod-block',
            rawCode: rawContent,
            statements,
            parseState,
          },
          displayMode: 'full-preview',
          editBehavior: config?.editBehavior || 'click-to-edit',
          heights: {
            previewPx,
            sourceLines: blockEnd - blockStart + 1,
            cardPx: previewPx,
          },
        });

        inBlock = false;
        blockStart = -1;
        blockContent = [];
      } else if (inBlock) {
        blockContent.push(line);
      }
    }

    return cards;
  }
}
