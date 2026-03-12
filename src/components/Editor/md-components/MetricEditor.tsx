/**
 * MetricEditor - Interactive controls for adding/editing workout metrics
 */

import React, { useState } from 'react';
import { ICodeStatement } from '../../../core/models/CodeStatement';

export interface MetricEditorProps {
  /** Current statements in the block */
  statements: ICodeStatement[];
  
  /** Callback when adding a new statement */
  onAddStatement?: (statementText: string) => void;
  
  /** Callback when editing an existing statement */
  onEditStatement?: (index: number, statementText: string) => void;
  
  /** Callback when deleting a statement */
  onDeleteStatement?: (index: number) => void;
}

/**
 * Component for adding and editing workout metrics
 */
export const MetricEditor: React.FC<MetricEditorProps> = ({
  statements,
  onAddStatement,
  onEditStatement,
  onDeleteStatement
}) => {
  const [newStatementText, setNewStatementText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    if (newStatementText.trim() && onAddStatement) {
      onAddStatement(newStatementText.trim());
      setNewStatementText('');
    }
  };

  const handleStartEdit = (index: number, currentText: string) => {
    setEditingIndex(index);
    setEditText(currentText);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editText.trim() && onEditStatement) {
      onEditStatement(editingIndex, editText.trim());
      setEditingIndex(null);
      setEditText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const handleDelete = (index: number) => {
    if (onDeleteStatement) {
      onDeleteStatement(index);
    }
  };

  return (
    <div className="metrics-editor p-4 border-t border-border">
      <h4 className="text-sm font-semibold text-foreground mb-3">
        Edit Workout
      </h4>

      {/* Statement List */}
      {statements.length > 0 && (
        <div className="space-y-2 mb-4">
          {statements.map((statement, index) => {
            const statementText = getStatementText(statement);
            const isEditing = editingIndex === index;

            return (
              <div
                key={statement.id || index}
                className="flex items-center gap-2 p-2 bg-muted/50 rounded border border-border"
              >
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-mono text-gray-700">
                      {statementText}
                    </span>
                    <button
                      onClick={() => handleStartEdit(index, statementText)}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      title="Edit statement"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      title="Delete statement"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Statement */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newStatementText}
            onChange={(e) => setNewStatementText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="Add new line (e.g., + 5 Pullups)"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={!newStatementText.trim()}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex flex-wrap gap-2">
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
      </div>
    </div>
  );
};

/**
 * Quick add button for common metrics types
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
    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
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
  // Try to reconstruct the original text from metrics
  const metrics = statement.metrics || [];
  
  if (metrics.length === 0) {
    return '(empty statement)';
  }

  // Build text from metrics
  const parts: string[] = [];
  
  metrics.forEach(metric => {
    const f = metric as any;
    switch (metric.type) {
      case 'Timer':
        if (f.duration) {
          parts.push(`${formatDuration(f.duration)}`);
        }
        if (f.action) {
          parts.push(f.action);
        }
        break;
      
      case 'Rounds':
        if (f.count) {
          parts.push(`(${f.count})`);
        }
        if (f.repScheme) {
          parts.push(f.repScheme);
        }
        break;
      
      case 'Effort':
        if (f.count) {
          parts.push(`${f.count}`);
        }
        if (f.exercise) {
          parts.push(f.exercise);
        }
        if (f.modifier) {
          parts.push(f.modifier);
        }
        break;
      
      case 'Action':
        if (f.action) {
          parts.push(f.action);
        }
        break;
      
      default:
        // Generic fallback
        parts.push(JSON.stringify(metrics).substring(0, 30));
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
