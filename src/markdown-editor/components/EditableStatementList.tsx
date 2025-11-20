/**
 * EditableStatementList - Unified component for viewing and editing workout statements
 * Combines the functionality of FragmentVisualizer and FragmentEditor
 */

import React, { useState } from 'react';
import { ICodeStatement } from '../../core/models/CodeStatement';
import { FragmentVisualizer } from '../../views/runtime/FragmentVisualizer';
import { SmartStatementInput } from './SmartStatementInput';

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
}

interface StatementItemProps {
  statement: ICodeStatement;
  index: number;
  indentLevel: number;
  onEdit: (index: number, text: string) => void;
  onDelete: (index: number) => void;
  onAddToGroup?: (parentId: number, text: string) => void;
  onAddAtLevel?: (text: string) => void;
  readonly?: boolean;
}

/**
 * Individual statement row with inline editing
 */
const StatementItem: React.FC<StatementItemProps> = ({
  statement,
  index,
  indentLevel,
  onEdit,
  onDelete,
  onAddToGroup,
  onAddAtLevel,
  readonly = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [showAddInGroup, setShowAddInGroup] = useState(false);
  const [showAddAtLevel, setShowAddAtLevel] = useState(false);
  const [addInGroupText, setAddInGroupText] = useState('');
  const [addAtLevelText, setAddAtLevelText] = useState('');

  const hasChildren = statement.children && statement.children.length > 0;
  const indentPx = indentLevel * 20;

  const handleStartEdit = () => {
    setEditText(getStatementText(statement));
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onEdit(index, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText('');
  };

  const handleAddInGroup = () => {
    if (addInGroupText.trim() && onAddToGroup) {
      onAddToGroup(statement.id, addInGroupText.trim());
      setAddInGroupText('');
      setShowAddInGroup(false);
    }
  };

  const handleAddAtLevel = () => {
    if (addAtLevelText.trim() && onAddAtLevel) {
      onAddAtLevel(addAtLevelText.trim());
      setAddAtLevelText('');
      setShowAddAtLevel(false);
    }
  };

  return (
    <div className="statement-item-container">
      <div 
        className="flex items-start gap-2 p-2 bg-card rounded border border-border hover:border-primary/50 transition-colors"
        style={{ marginLeft: `${indentPx}px` }}
      >
        {isEditing ? (
          <>
            <div className="flex-1">
              <SmartStatementInput
                value={editText}
                onChange={setEditText}
                onCommit={handleSaveEdit}
                onCancel={handleCancelEdit}
                autoFocus
              />
            </div>
            <button
              onClick={handleSaveEdit}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 shrink-0"
              title="Save (Enter)"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 shrink-0"
              title="Cancel (Esc)"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <FragmentVisualizer fragments={statement.fragments || []} />
            </div>
            <div className="flex gap-1 shrink-0">
              {!readonly && (
                <>
                  <button
                    onClick={handleStartEdit}
                    className="px-2 py-1 text-xs bg-background border border-border text-foreground rounded hover:bg-accent hover:text-accent-foreground"
                    title="Edit this line"
                  >
                    ✏️
                  </button>
                  {hasChildren && (
                    <button
                      onClick={() => setShowAddInGroup(!showAddInGroup)}
                      className="px-2 py-1 text-xs bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded hover:bg-green-100 dark:hover:bg-green-900/50"
                      title="Add to this group"
                    >
                      +
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddAtLevel(!showAddAtLevel)}
                    className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
                    title="Add line at this level"
                  >
                    ⊕
                  </button>
                  <button
                    onClick={() => onDelete(index)}
                    className="px-2 py-1 text-xs bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/50"
                    title="Delete this line"
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add to group input (indented) */}
      {showAddInGroup && hasChildren && (
        <div 
          className="flex items-center gap-2 mt-1 p-2 bg-green-50 border border-green-200 rounded"
          style={{ marginLeft: `${indentPx + 20}px` }}
        >
          <span className="text-xs text-green-700 shrink-0">Add to group:</span>
          <div className="flex-1">
            <SmartStatementInput
              value={addInGroupText}
              onChange={setAddInGroupText}
              onCommit={handleAddInGroup}
              onCancel={() => setShowAddInGroup(false)}
              placeholder="e.g., + 5 Pullups"
              autoFocus
            />
          </div>
          <button
            onClick={handleAddInGroup}
            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 shrink-0"
          >
            Add
          </button>
          <button
            onClick={() => setShowAddInGroup(false)}
            className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Add at level input (same indent) */}
      {showAddAtLevel && (
        <div 
          className="flex items-center gap-2 mt-1 p-2 bg-blue-50 border border-blue-200 rounded"
          style={{ marginLeft: `${indentPx}px` }}
        >
          <span className="text-xs text-blue-700 shrink-0">Add at level:</span>
          <div className="flex-1">
            <SmartStatementInput
              value={addAtLevelText}
              onChange={setAddAtLevelText}
              onCommit={handleAddAtLevel}
              onCancel={() => setShowAddAtLevel(false)}
              placeholder="e.g., + 10 Pushups"
              autoFocus
            />
          </div>
          <button
            onClick={handleAddAtLevel}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 shrink-0"
          >
            Add
          </button>
          <button
            onClick={() => setShowAddAtLevel(false)}
            className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 shrink-0"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Main component for editable statement list
 */
export const EditableStatementList: React.FC<EditableStatementListProps> = ({
  statements,
  onAddStatement,
  onEditStatement,
  onDeleteStatement,
  readonly = false
}) => {
  const [showAddNew, setShowAddNew] = useState(false);
  const [newStatementText, setNewStatementText] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupText, setNewGroupText] = useState('');

  const handleAddNew = () => {
    if (newStatementText.trim() && onAddStatement) {
      onAddStatement(newStatementText.trim());
      setNewStatementText('');
      setShowAddNew(false);
    }
  };

  const handleAddGroup = () => {
    if (newGroupText.trim() && onAddStatement) {
      onAddStatement(newGroupText.trim());
      setNewGroupText('');
      setShowAddGroup(false);
    }
  };

  return (
    <div className="editable-statement-list space-y-2">
      {/* Existing statements */}
      {statements.map((statement, index) => (
        <StatementItem
          key={statement.id || index}
          statement={statement}
          index={index}
          indentLevel={statement.parent ? 1 : 0}
          onEdit={onEditStatement!}
          onDelete={onDeleteStatement!}
          onAddToGroup={(parentId, text) => onAddStatement?.(text, parentId)}
          onAddAtLevel={(text) => onAddStatement?.(text)}
          readonly={readonly}
        />
      ))}

      {/* Add new line button */}
      {!showAddNew && !readonly && (
        <button
          onClick={() => setShowAddNew(true)}
          className="w-full px-3 py-2 text-sm bg-card border border-border text-foreground rounded hover:bg-accent hover:text-accent-foreground flex items-center justify-center gap-2"
        >
          <span>➕</span>
          <span>Add Line</span>
        </button>
      )}

      {/* Add new line input */}
      {showAddNew && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
          <div className="flex-1">
            <SmartStatementInput
              value={newStatementText}
              onChange={setNewStatementText}
              onCommit={handleAddNew}
              onCancel={() => setShowAddNew(false)}
              placeholder="e.g., + 5 Pullups or 20:00 AMRAP"
              autoFocus
            />
          </div>
          <button
            onClick={handleAddNew}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 shrink-0"
          >
            Add
          </button>
          <button
            onClick={() => setShowAddNew(false)}
            className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Add group button */}
      {!showAddGroup && !readonly && (
        <button
          onClick={() => setShowAddGroup(true)}
          className="w-full px-3 py-2 text-sm bg-card border border-border text-foreground rounded hover:bg-accent hover:text-accent-foreground flex items-center justify-center gap-2"
        >
          <span>📁</span>
          <span>Add Group</span>
        </button>
      )}

      {/* Add group input */}
      {showAddGroup && (
        <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
          <div className="flex-1">
            <SmartStatementInput
              value={newGroupText}
              onChange={setNewGroupText}
              onCommit={handleAddGroup}
              onCancel={() => setShowAddGroup(false)}
              placeholder="e.g., (3) or 5 Rounds"
              autoFocus
            />
          </div>
          <button
            onClick={handleAddGroup}
            className="px-4 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 shrink-0"
          >
            Add Group
          </button>
          <button
            onClick={() => setShowAddGroup(false)}
            className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Quick add buttons */}
      {!readonly && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <QuickAddButton
            label="Timer"
            icon="⏱"
            template="20:00 AMRAP"
            onClick={(text) => onAddStatement?.(text)}
          />
          <QuickAddButton
            label="Rounds"
            icon="🔄"
            template="(3)"
            onClick={(text) => onAddStatement?.(text)}
          />
          <QuickAddButton
            label="Effort"
            icon="💪"
            template="+ 10 Exercise"
            onClick={(text) => onAddStatement?.(text)}
          />
          <QuickAddButton
            label="Rest"
            icon="⏸"
            template="Rest 2:00"
            onClick={(text) => onAddStatement?.(text)}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Quick add button for common fragment types
 */
interface QuickAddButtonProps {
  label: string;
  icon: string;
  template: string;
  onClick: (text: string) => void;
}

const QuickAddButton: React.FC<QuickAddButtonProps> = ({
  label,
  icon,
  template,
  onClick
}) => (
  <button
    onClick={() => onClick(template)}
    className="px-2 py-1 text-xs bg-card border border-border text-foreground rounded hover:bg-accent hover:text-accent-foreground flex items-center gap-1"
    title={`Add ${label}`}
  >
    <span>{icon}</span>
    <span>{label}</span>
  </button>
);

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
