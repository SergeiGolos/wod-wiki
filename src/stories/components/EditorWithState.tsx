import React, { useState } from 'react';
import { WodRuntimeScript } from "@/core/WodRuntimeScript";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { WikiContainer } from '@/components/WikiContainer';
import { JsonViewer } from '@textea/json-viewer';
import { SoundProvider } from '@/contexts/SoundContext';
import { ScreenProvider } from '@/contexts/ScreenContext';
import { useLocalLogSync } from '@/components/syncs/useLocalLogSync';

/**
 * 
 * A wrapper component for WikiContainer that displays JSON state for debugging
 * This component provides visualization panels for:
 * 1. The compiled script structure
 * 2. The workout results as they are generated
 */
interface EditorWithStateProps extends React.ComponentProps<typeof WikiContainer> {
  debug?: boolean;
}

export const EditorWithState: React.FC<EditorWithStateProps> = ({ debug = false, ...props }) => {
  const [compiledScript, setCompiledScript] = useState<WodRuntimeScript | null>(null);
  const [results, setResults] = useState<RuntimeSpan[]>([]);
  const [logs, setLogs] = useLocalLogSync();
  const [selectedTab, setSelectedTab] = useState<'script' | 'results' | 'logs'>('logs');

  return (
    <ScreenProvider>
      <SoundProvider>
        <div className="flex flex-col gap-4">
          <WikiContainer
            className='md:mt-0'
            {...props}
            onScriptCompiled={(script) => setCompiledScript(script)}
            onResultsUpdated={(newResults) => setResults(newResults)}
            outbound={(newLog) => Promise.resolve(setLogs(newLog))}
          />
          
          {debug && (
  <div className="flex flex-col w-full">
    {/* Tab Bar */}
    <div className="flex gap-2">
      {[
        { key: 'logs', label: 'Logs' },
        { key: 'script', label: 'Script' },
        { key: 'results', label: 'Results' },
        
      ].map(tab => (
        <button
          key={tab.key}
          className={`px-4 py-2 rounded-t border-b-2 font-semibold transition-colors duration-150 ${selectedTab === tab.key ? 'border-blue-500 bg-white text-blue-700' : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          onClick={() => setSelectedTab(tab.key as typeof selectedTab)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
    {/* Tab Content */}
    <div className="">
      {selectedTab === 'script' && (
        <>          
          <div className="overflow-auto max-h-64 bg-white p-3 rounded border-t text-sm font-mono">
            <JsonViewer value={compiledScript} />
          </div>
        </>
      )}
      {selectedTab === 'results' && (
        <>          
          <div className="overflow-auto max-h-64 bg-white p-3 rounded border border-gray-300 text-sm font-mono">
            <JsonViewer value={results} />
          </div>
        </>
      )}
      {selectedTab === 'logs' && (
        <>
          <div className="overflow-auto max-h-64 bg-white p-3 rounded border border-gray-300 text-sm font-mono">
            <JsonViewer value={logs} />
          </div>
        </>
      )}
    </div>
  </div>
)}
        </div>
      </SoundProvider>
    </ScreenProvider>
  );
};
