/**
 * ContextPanel - Displays parsed WOD block information and controls
 */

import React from 'react';
import { WodBlock } from '../types';
import { FragmentVisualizer } from '../../components/fragments/FragmentVisualizer';

export interface ContextPanelProps {
  /** Block data to display */
  block: WodBlock;
  
  /** Whether panel is in compact mode */
  compact?: boolean;
}

/**
 * Panel showing parsed workout information
 */
export const ContextPanel: React.FC<ContextPanelProps> = ({
  block,
  compact = false
}) => {
  const hasStatements = block.statements && block.statements.length > 0;
  const hasErrors = block.errors && block.errors.length > 0;

  return (
    <div className="context-panel bg-white border-l border-gray-300 h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">
          WOD Block Context
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Lines {block.startLine + 1} - {block.endLine + 1}
        </p>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Parsing Status */}
        {block.state === 'parsing' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-700">Parsing workout...</p>
          </div>
        )}

        {/* Parse Errors */}
        {hasErrors && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <h4 className="text-sm font-semibold text-red-700 mb-2">
              Parse Errors
            </h4>
            {block.errors!.map((error, idx) => (
              <div key={idx} className="text-xs text-red-600 mb-1">
                {error.line && <span className="font-mono">Line {error.line}: </span>}
                {error.message}
              </div>
            ))}
          </div>
        )}

        {/* Parsed Fragments */}
        {hasStatements && !hasErrors && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Parsed Workout
            </h4>
            <div className="space-y-2">
              {block.statements!.map((statement, idx) => (
                <div key={statement.id || idx} className="border border-gray-200 rounded p-2">
                  <FragmentVisualizer statement={statement} compact={compact} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasStatements && !hasErrors && block.state !== 'parsing' && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              No workout content yet
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Start typing to see parsed fragments
            </p>
          </div>
        )}

        {/* Block Info */}
        {!compact && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">
              Block Information
            </h4>
            <dl className="text-xs space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">State:</dt>
                <dd className="text-gray-700 font-mono">{block.state}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Statements:</dt>
                <dd className="text-gray-700">{block.statements?.length || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Content Length:</dt>
                <dd className="text-gray-700">{block.content.length} chars</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
};
