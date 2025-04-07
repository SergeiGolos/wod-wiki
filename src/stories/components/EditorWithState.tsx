import React, { useState } from 'react';
import { ResultSpan, WodRuntimeScript } from '@/core/timer.types';
import { EditorContainer } from '@/components/editor/EditorContainer';
import { JsonViewer } from '@textea/json-viewer';
import { SoundProvider } from '@/core/contexts/SoundContext';
import { ScreenProvider } from '@/core/contexts/ScreenContext';

/**
 * A wrapper component for EditorContainer that displays JSON state for debugging
 * 
 * This component provides visualization panels for:
 * 1. The compiled script structure
 * 2. The workout results as they are generated
 */
export const EditorWithState: React.FC<React.ComponentProps<typeof EditorContainer>> = (props) => {
  const [compiledScript, setCompiledScript] = useState<WodRuntimeScript | null>(null);
  const [results, setResults] = useState<ResultSpan[]>([]);

  return (
    <ScreenProvider>
      <SoundProvider>
        <div className="flex flex-col md:flex-row gap-4 ">
          <EditorContainer
            className='md:mt-0 md:w-1/2'
            {...props}
            onScriptCompiled={(script) => setCompiledScript(script)}
            onResultsUpdated={(newResults) => setResults(newResults)}
          />
          
          <div className="flex flex-col gap-4 mt-4 md:mt-0 md:w-1/2">
            {/* Script Data Display */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-700">Compiled Script</h3>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {compiledScript ? `${compiledScript.statements.length} statements` : 'No script'}
                </span>
              </div>
              <div className="overflow-auto max-h-64 bg-white p-3 rounded border border-gray-300 text-sm font-mono">            
                <JsonViewer value={compiledScript} />            
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
                <JsonViewer value={results} />
              </div>
            </div>
          </div>
        </div>
      </SoundProvider>
    </ScreenProvider>
  );
};
