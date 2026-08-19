import type { ICodeStatement } from '@bitcobblers/wod-wiki-engine';
import type { IListItem } from '../types';

export function statementToListItem(
  statement: ICodeStatement,
  lineNumber?: number,
): IListItem<ICodeStatement> {
  const label = statement.metrics
    .map(m => String(m))
    .join(' ')
    || `Statement ${statement.id}`;

  return {
    id: String(statement.id),
    label,
    subtitle: lineNumber !== undefined ? `Line ${lineNumber}` : undefined,
    badge: lineNumber,
    depth: 0,
    payload: statement,
  };
}
