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
  const [scriptCollapsed, setScriptCollapsed] = useState<boolean>(true);
  const [resultsCollapsed, setResultsCollapsed] = useState<boolean>(true);

  return (
    <ScreenProvider>
      <SoundProvider>
        <div className="flex flex-col md:flex-row gap-4 ">
          <EditorContainer
            className='md:mt-0 md:w-2/3'
            {...props}
            onScriptCompiled={(script) => setCompiledScript(script)}
            onResultsUpdated={(newResults) => setResults(newResults)}
          />
          
          <div className="flex flex-col gap-4 mt-4 md:mt-0 md:w-1/3">
            {/* Script Data Display */}
            <div className="border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-stretch shadow-sm">
                <div 
                  className="flex-grow cursor-pointer hover:bg-gray-100 transition-colors p-4"
                  onClick={() => setScriptCollapsed(!scriptCollapsed)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-700">Compiled Script</h3>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {compiledScript ? `${compiledScript.statements.length} statements` : 'No script'}
                    </span>
                  </div>
                </div>
                
                {/* Toggle button on the right */}
                <div 
                  className="flex items-center justify-center w-12 px-2 border-l border-gray-200 cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors"
                  onClick={() => setScriptCollapsed(!scriptCollapsed)}
                >
                  <div className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center leading-none">
                    <span className="text-gray-600 font-bold" style={{ lineHeight: '1', marginTop: '-1px' }}>
                      {scriptCollapsed ? '+' : '−'}
                    </span>
                  </div>
                </div>
              </div>
              
              {!scriptCollapsed && (
                <div className="p-4">
                  <div className="overflow-auto max-h-64 bg-white p-3 rounded border border-gray-300 text-sm font-mono">            
                    <JsonViewer value={compiledScript} />            
                  </div>
                </div>
              )}
            </div>
            
            {/* Results Data Display */}
            <div className="border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-stretch shadow-sm">
                <div 
                  className="flex-grow cursor-pointer hover:bg-gray-100 transition-colors p-4"
                  onClick={() => setResultsCollapsed(!resultsCollapsed)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-700">Workout Results</h3>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {results.length} blocks
                    </span>
                  </div>
                </div>
                
                {/* Toggle button on the right */}
                <div 
                  className="flex items-center justify-center w-12 px-2 border-l border-gray-200 cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors"
                  onClick={() => setResultsCollapsed(!resultsCollapsed)}
                >
                  <div className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center leading-none">
                    <span className="text-gray-600 font-bold" style={{ lineHeight: '1', marginTop: '-1px' }}>
                      {resultsCollapsed ? '+' : '−'}
                    </span>
                  </div>
                </div>
              </div>
              
              {!resultsCollapsed && (
                <div className="p-4">
                  <div className="overflow-auto max-h-64 bg-white p-3 rounded border border-gray-300 text-sm font-mono">
                    <JsonViewer value={results} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SoundProvider>
    </ScreenProvider>
  );
};
