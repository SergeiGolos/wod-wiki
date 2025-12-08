import React, { useCallback } from 'react';
import { WodWiki } from '../../editor/WodWiki';
import { EditorPanelProps } from '../types/interfaces';
import { panelBase, panelHeader, panelHeaderTitle, panelContent } from '../styles/tailwind-components';

/**
 * EditorPanel component - wraps WodWiki Monaco editor with runtime test bench styling
 * Provides line highlighting, error display, and status indicators
 */
export const EditorPanel: React.FC<EditorPanelProps> = ({
  value,
  onChange,
  highlightedLine,
  errors = [],
  status,
  suggestions = [],
  onSuggestionSelect,
  onLineClick,
  readonly = false,
  className = '',
  testId = 'editor-panel'
}) => {
  // Handle WodWiki value changes
  const handleValueChange = useCallback((script?: any) => {
    // WodWiki passes parsed script object, we need the raw string
    if (typeof script === 'string') {
      onChange(script);
    }
  }, [onChange]);

  // Status badge styling and text
  const getStatusBadge = () => {
    const statusConfig: Record<string, { text: string; className: string }> = {
      idle: { text: 'Ready', className: 'bg-gray-600 text-gray-200' },
      parsing: { text: 'Parsing...', className: 'bg-yellow-600 text-yellow-200' },
      valid: { text: 'Valid', className: 'bg-green-600 text-green-200' },
      error: { text: 'Error', className: 'bg-red-600 text-red-200' },
      running: { text: 'Running', className: 'bg-blue-600 text-blue-200' },
      paused: { text: 'Paused', className: 'bg-yellow-600 text-yellow-200' },
      completed: { text: 'Completed', className: 'bg-green-600 text-green-200' }
    };

    const config = statusConfig[status] || { text: status, className: 'bg-gray-600 text-gray-200' };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.className}`}>
        {config.text}
      </span>
    );
  };

  // Error display
  const renderErrors = () => {
    if (errors.length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        <div className="text-red-400 text-sm font-medium">
          {errors.length} error{errors.length !== 1 ? 's' : ''}
        </div>
        {errors.map((error, index) => (
          <div key={index} className="text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-800">
            <div className="font-medium">Line {error.line}, Column {error.column}</div>
            <div className="text-red-300">{error.message}</div>
            {error.suggestion && (
              <div className="text-yellow-400 mt-1">💡 {error.suggestion}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`${panelBase} ${className}`} data-testid={testId}>
      {/* Panel Header */}
      <div className={panelHeader}>
        <h3 className={panelHeaderTitle}>Workout Script</h3>
        {getStatusBadge()}
      </div>

      {/* Panel Content */}
      <div className={panelContent}>
        {/* Editor */}
        <div className="h-96">
          <WodWiki
            id="runtime-test-bench-editor"
            code={value}
            onValueChange={handleValueChange}
            readonly={readonly}
            highlightedLine={highlightedLine}
            onLineClick={onLineClick}
          />
        </div>

        {/* Errors */}
        {renderErrors()}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-4">
            <h4 className="text-foreground text-sm font-medium mb-2">Suggestions:</h4>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSuggestionSelect?.(suggestion)}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
