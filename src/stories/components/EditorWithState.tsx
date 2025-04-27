import React, { useState } from 'react';
import { ResultSpan, WodRuntimeScript } from '@/core/timer.types';
import { WikiContainer } from '@/components/WikiContainer';
import { JsonViewer } from '@textea/json-viewer';
import { SoundProvider } from '@/contexts/SoundContext';
import { ScreenProvider } from '@/contexts/ScreenContext';

/**
 * A wrapper component for WikiContainer that displays JSON state for debugging
 * 
 * This component provides visualization panels for:
 * 1. The compiled script structure
 * 2. The workout results as they are generated
 */
interface EditorWithStateProps extends React.ComponentProps<typeof WikiContainer> {
  debug?: boolean;
}

export const EditorWithState: React.FC<EditorWithStateProps> = ({ debug = false, ...props }) => {
  const [compiledScript, setCompiledScript] = useState<WodRuntimeScript | null>(null);
  const [results, setResults] = useState<ResultSpan[]>([]);

  return (
    <ScreenProvider>
      <SoundProvider>
        <div className="flex flex-col gap-4">
          <WikiContainer
            className='md:mt-0'
            {...props}
            onScriptCompiled={(script) => setCompiledScript(script)}
            onResultsUpdated={(newResults) => setResults(newResults)}
          />
          
          {debug && (
            <div className="flex flex-col md:flex-row gap-4 mt-4 w-full">
              {/* Script Data Display - Simplified */}
              <div className="border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-700 p-2">Compiled Script</h3>
                <div className="overflow-auto max-h-64 bg-white p-3 rounded border border-gray-300 text-sm font-mono">            
                  <JsonViewer value={compiledScript} />            
                </div>
              </div>
              
              {/* Results Data Display - Simplified */}
              <div className="border border-gray-200 rounded-lg bg-gray-50" >
                <h3 className="text-lg font-semibold text-gray-700 p-2">Workout Results</h3>
                <div className="overflow-auto max-h-64 bg-white p-3 rounded border border-gray-300 text-sm font-mono">
                  <JsonViewer value={results} />
                </div>
              </div>
            </div>
          )}
        </div>
      </SoundProvider>
    </ScreenProvider>
  );
};
