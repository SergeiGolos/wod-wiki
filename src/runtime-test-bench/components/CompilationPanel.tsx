import React from 'react';
import { CompilationPanelProps } from '../types/interfaces';
import { panelBase, panelHeader, panelHeaderTitle, panelContent } from '../styles/tailwind-components';

/**
 * CompilationPanel component - displays compilation output with tabbed interface
 * Shows parsed statements, errors, warnings, and compilation logs
 */
export const CompilationPanel: React.FC<CompilationPanelProps> = ({
  statements = [],
  errors,
  warnings,
  compilationLog,
  activeTab,
  onTabChange,
  onStatementClick,
  onErrorClick,
  className = '',
  testId = 'compilation-panel'
}) => {
  const tabs = [
    { id: 'output' as const, label: 'Output', count: statements.length },
    { id: 'errors' as const, label: 'Errors', count: errors.length + warnings.length }
  ];

  // Render output tab content
  const renderOutputTab = () => (
    <div className="space-y-4">
      {statements.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No compiled statements to display
        </div>
      ) : (
        <div className="space-y-2">
          {statements.map((statement, index) => (
            <div
              key={index}
              className="p-3 bg-muted/50 rounded border border-border cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onStatementClick?.(index)}
              data-testid={`statement-${index}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">
                  Statement {index + 1}
                </span>
              </div>
              <div className="text-sm text-foreground font-mono">
                {JSON.stringify(statement, null, 2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render errors tab content
  const renderErrorsTab = () => {
    const allIssues = [
      ...errors.map(error => ({ ...error, type: 'error' as const })),
      ...warnings.map(warning => ({ ...warning, type: 'warning' as const, severity: 'warning' as const }))
    ];

    return (
      <div className="space-y-4">
        {allIssues.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No errors or warnings to display
          </div>
        ) : (
          <div className="space-y-2">
            {allIssues.map((issue, index) => (
              <div
                key={index}
                className={`
                  p-3 rounded border cursor-pointer transition-colors
                  ${issue.severity === 'error'
                    ? 'bg-red-900/20 border-red-800 hover:border-red-600'
                    : 'bg-yellow-900/20 border-yellow-800 hover:border-yellow-600'
                  }
                `}
                onClick={() => onErrorClick?.(issue)}
                data-testid={`issue-${index}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    issue.severity === 'error'
                      ? 'bg-red-600 text-white'
                      : 'bg-yellow-600 text-white'
                  }`}>
                    {issue.severity.toUpperCase()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Line {issue.line}, Column {issue.column}
                  </span>
                </div>
                <div className="text-foreground mb-1">
                  {issue.message}
                </div>
                {'suggestion' in issue && issue.suggestion && (
                  <div className="text-yellow-400 text-sm">
                    💡 {issue.suggestion}
                  </div>
                )}
                {'code' in issue && (
                  <div className="text-xs text-muted-foreground/80 mt-1">
                    Code: {issue.code}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Compilation Log */}
        {compilationLog.length > 0 && (
          <div className="mt-6">
            <h4 className="text-foreground font-medium mb-3">Compilation Log</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {compilationLog.map(entry => (
                <div
                  key={entry.id}
                  className={`text-sm p-2 rounded ${
                    entry.level === 'error' ? 'bg-destructive/20 text-destructive' :
                    entry.level === 'warning' ? 'bg-yellow-900/20 text-yellow-400' :
                    entry.level === 'success' ? 'bg-green-900/20 text-green-400' :
                    'bg-muted/50 text-muted-foreground'
                  }`}
                  data-testid={`log-${entry.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`text-xs px-1 rounded ${
                      entry.level === 'error' ? 'bg-red-600' :
                      entry.level === 'warning' ? 'bg-yellow-600' :
                      entry.level === 'success' ? 'bg-green-600' :
                      'bg-gray-600'
                    } text-white`}>
                      {entry.level.toUpperCase()}
                    </span>
                  </div>
                  <div>{entry.message}</div>
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div className="text-xs mt-1 opacity-70">
                      {JSON.stringify(entry.metadata)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${panelBase} ${className}`} data-testid={testId}>
      {/* Panel Header */}
      <div className={panelHeader}>
        <h3 className={panelHeaderTitle}>Compilation</h3>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }
            `}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                tab.id === 'errors' ? 'bg-destructive' : 'bg-primary'
              } text-primary-foreground`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className={panelContent}>
        {activeTab === 'output' ? renderOutputTab() : renderErrorsTab()}
      </div>
    </div>
  );
};