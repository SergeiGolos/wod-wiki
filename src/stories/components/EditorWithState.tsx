import React, { useState } from 'react';
import { WodRuntimeScript } from '../../core/md-timer';
import { WodResultBlock } from '../../core/timer.types';
import { EditorContainer } from '../../components/editor/EditorContainer';


/**
 * A wrapper component for EditorContainer that displays JSON state for debugging
 * 
 * This component provides visualization panels for:
 * 1. The compiled script structure
 * 2. The workout results as they are generated
 */
export const EditorWithState: React.FC<React.ComponentProps<typeof EditorContainer>> = (props) => {
  const [compiledScript, setCompiledScript] = useState<WodRuntimeScript | null>(null);
  const [results, setResults] = useState<WodResultBlock[]>([]);

  return (
    <div className="flex flex-col gap-4">
      <EditorContainer
        {...props}
        onScriptCompiled={(script) => setCompiledScript(script)}
        onResultsUpdated={(newResults) => setResults(newResults)}
      />
      
      <div className="flex flex-col gap-4 mt-4">
        {/* Script Data Display */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-700">Compiled Script</h3>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              {compiledScript ? `${compiledScript.statements.length} statements` : 'No script'}
            </span>
          </div>
          <div className="overflow-auto max-h-64 bg-white p-3 rounded border border-gray-300 text-sm font-mono">
            <pre className="whitespace-pre-wrap">
              {compiledScript ? JSON.stringify(compiledScript, null, 2) : 'Script not compiled yet'}
            </pre>
          </div>
        </div>
        
        {/* Results Data Display */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-700">Workout Results</h3>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
              {results.length} blocks
            </span>
          </div>
          <div className="overflow-auto max-h-64 bg-white p-3 rounded border border-gray-300 text-sm font-mono">
            <pre className="whitespace-pre-wrap">
              {results.length > 0 ? JSON.stringify(results, null, 2) : 'No results available'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
