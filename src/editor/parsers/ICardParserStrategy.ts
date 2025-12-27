import type { InlineWidgetCard } from '../inline-cards/types';

export interface ICardParserStrategy {
  parse(lines: string[], existingCards: InlineWidgetCard[]): InlineWidgetCard[];
}
