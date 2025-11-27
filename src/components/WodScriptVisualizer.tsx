import React, { useMemo } from 'react';
import { ICodeStatement } from '../core/models/CodeStatement';
import { FragmentVisualizer } from '../views/runtime/FragmentVisualizer';

export interface WodScriptVisualizerProps {
  statements: ICodeStatement[];
  activeStatementIds?: Set<number>;
  selectedStatementId?: number | null;
  onSelectionChange?: (id: number | null) => void;
  onHover?: (id: number | null) => void;
  onRenderActions?: (statement: ICodeStatement) => React.ReactNode;
  className?: string;
}

interface LinkedGroup {
  id: string;
  statements: ICodeStatement[];
}

/**
 * Helper to check if a statement is a link (starts with +)
 */
function isLinkStatement(statement: ICodeStatement): boolean {
  return statement.fragments.some(f => f.fragmentType === 'lap' && f.image === '+');
}

/**
 * Calculate nesting depth of a statement
 */
function getDepth(stmt: ICodeStatement, allStatements: Map<number, ICodeStatement>): number {
  let depth = 0;
  let current = stmt;
  while (current.parent) {
    const parent = allStatements.get(current.parent);
    if (!parent) break;
    depth++;
    current = parent;
    // Safety break to prevent infinite loops
    if (depth > 10) break;
  }
  return depth;
}

export const WodScriptVisualizer: React.FC<WodScriptVisualizerProps> = ({
  statements,
  activeStatementIds = new Set(),
  selectedStatementId,
  onSelectionChange,
  onHover,
  onRenderActions,
  className = ''
}) => {

  // Group statements logic (reused from EditableStatementList)
  const groups = useMemo(() => {
    const result: (ICodeStatement | LinkedGroup)[] = [];
    let currentGroup: ICodeStatement[] = [];

    for (const stmt of statements) {
      const isLink = isLinkStatement(stmt);

      if (currentGroup.length === 0) {
        currentGroup.push(stmt);
        continue;
      }

      const previousStmt = currentGroup[currentGroup.length - 1];
      const previousIsLink = isLinkStatement(previousStmt);

      // Only group if BOTH are links
      if (isLink && previousIsLink) {
        currentGroup.push(stmt);
      } else {
        // Close previous group
        if (currentGroup.length === 1) {
          result.push(currentGroup[0]);
        } else {
          result.push({ 
            id: `group-${currentGroup[0].id}`, 
            statements: [...currentGroup] 
          });
        }
        // Start new group with this statement
        currentGroup = [stmt];
      }
    }

    // Push remaining
    if (currentGroup.length > 0) {
      if (currentGroup.length === 1) {
        result.push(currentGroup[0]);
      } else {
        result.push({ 
          id: `group-${currentGroup[0].id}`, 
          statements: [...currentGroup] 
        });
      }
    }
    
    return result;
  }, [statements]);

  const statementMap = useMemo(() => new Map<number, ICodeStatement>(statements.map(s => [s.id, s])), [statements]);

  const renderStatement = (stmt: ICodeStatement, isGrouped = false, isLastInGroup = false) => {
    const isActive = activeStatementIds.has(stmt.id);
    const isSelected = selectedStatementId === stmt.id;
    
    let containerClass = "flex items-center gap-2 p-2 transition-colors cursor-pointer ";
    
    if (isGrouped) {
        containerClass += isActive ? 'bg-primary/10 ' : 'hover:bg-accent/5 ';
        if (!isLastInGroup) containerClass += "border-b border-border ";
    } else {
        containerClass += "bg-card rounded border border-border hover:border-primary/50 ";
        containerClass += isActive ? 'bg-primary/10 border-primary ' : '';
        containerClass += isSelected ? 'ring-2 ring-blue-500 ' : '';
    }

    return (
      <div 
        key={stmt.id} 
        className={containerClass}
        onClick={(e) => {
            e.stopPropagation();
            onSelectionChange?.(stmt.id);
        }}
        onMouseEnter={() => onHover?.(stmt.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        <div className="flex-1 min-w-0">
          <FragmentVisualizer fragments={stmt.fragments || []} />
        </div>
        {onRenderActions && (
            <div className="flex gap-1 shrink-0">
                {onRenderActions(stmt)}
            </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {groups.map((item) => {
        const firstStmt = 'statements' in item ? item.statements[0] : item;
        const depth = getDepth(firstStmt, statementMap);
        const indentStyle = { marginLeft: `${depth * 1.5}rem` };

        if ('statements' in item) {
          const group = item as LinkedGroup;
          return (
            <div key={group.id} style={indentStyle} className="bg-card rounded border border-border overflow-hidden hover:border-primary/50 transition-colors">
              {group.statements.map((stmt, i) => renderStatement(stmt, true, i === group.statements.length - 1))}
            </div>
          );
        } else {
          const stmt = item as ICodeStatement;
          return (
            <div key={stmt.id} style={indentStyle}>
              {renderStatement(stmt)}
            </div>
          );
        }
      })}
    </div>
  );
};
