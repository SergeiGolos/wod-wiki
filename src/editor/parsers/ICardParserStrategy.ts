import { editor } from 'monaco-editor';
import { InlineWidgetCard } from '../inline-cards/types';

export interface ICardParserStrategy {
  parse(lines: string[], existingCards: InlineWidgetCard[]): InlineWidgetCard[];
}
