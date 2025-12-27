/**
 * EditableStatementList - Unified component for viewing and editing workout statements
 * Combines the functionality of FragmentVisualizer and FragmentEditor
 */

import React, { useMemo } from 'react';
import { ICodeStatement } from '../../core/models/CodeStatement';
import { FragmentVisualizer } from '../../views/runtime/FragmentVisualizer';
import { useCommandPalette } from '../../components/command-palette/CommandContext';
import { CommandStrategy } from '../../components/command-palette/types';

export interface EditableStatementListProps {
  /** Current statements in the block */
  statements: ICodeStatement[];
  
  /** Callback when adding a new statement */
  onAddStatement?: (statementText: string, parentId?: number) => void;
  
  /** Callback when editing an existing statement */
  onEditStatement?: (index: number, statementText: string) => void;
  
  /** Callback when deleting a statement */
  onDeleteStatement?: (index: number) => void;

  /** Whether the list is read-only */
  readonly?: boolean;

  /** Active statement IDs (blocks currently on the stack) */
  activeStatementIds?: Set<number>;
}

interface StatementItemProps {
  statement: ICodeStatement;
  originalIndex: number;
  onEdit: (index: number, text: string) => void;
  onDelete: (index: number) => void;
  readonly?: boolean;
  isGrouped?: boolean;
  isActive?: boolean;
}

interface LinkedGroup {
  id: string;
  statements: ICodeStatement[];
}

/**
 * Individual statement row
 */
const StatementItem: React.FC<StatementItemProps> = ({
  statement,
  originalIndex,
  onEdit,
  onDelete,
  readonly = false,
  isGrouped = false,
  isActive = false
}) => {
  const { setStrategy, setIsOpen } = useCommandPalette();

  const handleEdit = () => {
    const text = getStatementText(statement);
    const strategy: CommandStrategy = {
      id: `edit-${statement.id}`,
      getCommands: () => [],
      handleInput: (newText) => {
        onEdit(originalIndex, newText);
        return true;
      },
      placeholder: "Edit statement...",
      initialInputValue: text
    };
    setStrategy(strategy);
    setIsOpen(true);
  };

  const containerClass = isGrouped
    ? `flex items-center gap-2 p-2 hover:bg-accent/5 transition-colors ${isActive ? 'bg-primary/10' : ''}`
    : `flex items-center gap-2 p-2 bg-card rounded border border-border hover:border-primary/50 transition-colors ${isActive ? 'bg-primary/10 border-primary' : ''}`;

  return (
    <div className={containerClass}>
      <div className="flex-1 min-w-0">
        <FragmentVisualizer fragments={statement.fragments || []} />
      </div>
      {!readonly && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={handleEdit}
            className="px-2 py-1 text-xs bg-background border border-border text-foreground rounded hover:bg-accent hover:text-accent-foreground"
            title="Edit this line"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(originalIndex)}
            className="px-2 py-1 text-xs bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/50"
            title="Delete this line"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Group of linked statements (e.g. EMOM + exercises)
 */
const StatementGroupItem: React.FC<{ 
  group: LinkedGroup, 
  statements: ICodeStatement[],
  onEdit: (index: number, text: string) => void,
  onDelete: (index: number) => void,
  readonly?: boolean,
  activeStatementIds?: Set<number>
}> = ({ group, statements, onEdit, onDelete, readonly, activeStatementIds }) => {
  return (
    <div className="bg-card rounded border border-border overflow-hidden mb-2 hover:border-primary/50 transition-colors">
      {group.statements.map((stmt, i) => {
        const index = statements.findIndex(s => s.id === stmt.id);
        const isActive = activeStatementIds?.has(stmt.id) ?? false;
        return (
          <div key={stmt.id} className={i < group.statements.length - 1 ? "border-b border-border" : ""}>
            <StatementItem 
              statement={stmt} 
              originalIndex={index}
              onEdit={onEdit}
              onDelete={onDelete}
              readonly={readonly}
              isGrouped={true}
              isActive={isActive}
            />
          </div>
        );
      })}
    </div>
  );
};

/**
 * Helper to check if a statement is a link (starts with +)
 */
function isLinkStatement(statement: ICodeStatement): boolean {
  return statement.fragments.some(f => f.type === 'lap' && f.value === 'compose');
}

/**
 * Main component for editable statement list
 */
export const EditableStatementList: React.FC<EditableStatementListProps> = ({
  statements,
  onAddStatement: _onAddStatement,
  onEditStatement,
  onDeleteStatement,
  readonly = false,
  activeStatementIds = new Set()
}) => {
  
  // Group statements logic
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

  return (
    <div className="editable-statement-list space-y-2">
      {groups.map((item) => {
        const firstStmt = 'statements' in item ? item.statements[0] : item;
        const depth = getDepth(firstStmt, statementMap);
        const indentStyle = { marginLeft: `${depth * 1.5}rem` };

        if ('statements' in item) {
          const group = item as LinkedGroup;
          return (
            <div key={group.id} style={indentStyle}>
              <StatementGroupItem
                group={group}
                statements={statements}
                onEdit={onEditStatement!}
                onDelete={onDeleteStatement!}
                readonly={readonly}
                activeStatementIds={activeStatementIds}
              />
            </div>
          );
        } else {
          const stmt = item as ICodeStatement;
          const index = statements.findIndex(s => s.id === stmt.id);
          const isActive = activeStatementIds.has(stmt.id);
          return (
            <div key={stmt.id} style={indentStyle}>
              <StatementItem
                statement={stmt}
                originalIndex={index}
                onEdit={onEditStatement!}
                onDelete={onDeleteStatement!}
                readonly={readonly}
                isActive={isActive}
              />
            </div>
          );
        }
      })}
    </div>
  );
};

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

/**
 * Extract displayable text from a code statement
 */
function getStatementText(statement: ICodeStatement): string {
  const fragments = statement.fragments || [];
  
  if (fragments.length === 0) {
    return '(empty statement)';
  }

  const parts: string[] = [];
  
  fragments.forEach(fragment => {
    // Use image if available (this is the original text token)
    if (fragment.image) {
      parts.push(fragment.image);
      return;
    }
    
    // Otherwise, try to extract meaningful value
    if (fragment.value !== undefined) {
      if (typeof fragment.value === 'object') {
        // For complex values, try to extract key properties
        const val = fragment.value as any;
        if (val.duration !== undefined) {
          parts.push(formatDuration(val.duration));
        } else if (val.count !== undefined) {
          parts.push(String(val.count));
        } else if (val.exercise !== undefined) {
          parts.push(val.exercise);
        } else {
          parts.push(JSON.stringify(val));
        }
      } else {
        parts.push(String(fragment.value));
      }
    }
  });

  return parts.join(' ') || '(unknown format)';
}

/**
 * Format duration in seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
