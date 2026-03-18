import React from 'react';
import type { ICodeStatement } from '@/core/models/CodeStatement';
import { MetricVisualizer } from '../metrics';

export interface StatementListProps {
  statements: ICodeStatement[];
  activeStatementIds?: Set<number>;
  readonly?: boolean;
  className?: string;
}

export const StatementList: React.FC<StatementListProps> = ({
  statements,
  activeStatementIds = new Set(),
  className = '',
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {statements.map((statement, idx) => {
        const isActive = activeStatementIds.has(statement.id);
        return (
          <div
            key={statement.id || idx}
            className={`p-1 rounded transition-colors ${
              isActive ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-muted-foreground/40 w-4 select-none pt-1">
                {statement.meta?.line ?? (idx + 1)}
              </span>
              <div className="flex-1 min-w-0">
                <MetricVisualizer metrics={statement.metrics} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
