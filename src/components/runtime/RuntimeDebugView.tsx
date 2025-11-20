import React, { useEffect, useState } from 'react';
import { IScriptRuntime } from '../../runtime/IScriptRuntime';
import { IRuntimeBlock } from '../../runtime/IRuntimeBlock';
import { IMemoryReference } from '../../runtime/IMemoryReference';

interface RuntimeDebugViewProps {
  runtime: IScriptRuntime;
}

export const RuntimeDebugView: React.FC<RuntimeDebugViewProps> = ({ runtime }) => {
  const [stack, setStack] = useState<readonly IRuntimeBlock[]>([]);
  const [memoryRefs, setMemoryRefs] = useState<IMemoryReference[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Poll for updates every 100ms
    // In a real implementation, we would want to subscribe to runtime events
    const interval = setInterval(() => {
      setStack(runtime.stack.blocksTopFirst);
      // Accessing private _references via search with empty criteria to get all
      setMemoryRefs(runtime.memory.search({}));
      setTick(t => t + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [runtime]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-mono text-xs overflow-hidden border-l border-gray-200 dark:border-gray-700">
      <div className="p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
        Runtime Debugger
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stack View */}
        <div className="flex-1 overflow-auto p-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-blue-600 dark:text-blue-400 mb-2 font-bold">Call Stack ({stack.length})</h3>
          <div className="space-y-1">
            {stack.map((block, index) => (
              <div key={block.key.toString()} className={`p-2 rounded border ${index === 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/50'}`}>
                <div className="flex justify-between">
                  <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{block.constructor.name}</span>
                  <span className="text-gray-400 dark:text-gray-500">#{block.key.toString().split('-').pop()}</span>
                </div>
                <div className="text-gray-500 dark:text-gray-400 truncate mt-1">{block.key.toString()}</div>
              </div>
            ))}
            {stack.length === 0 && <div className="text-gray-400 dark:text-gray-600 italic">Stack empty</div>}
          </div>
        </div>

        {/* Memory View */}
        <div className="flex-1 overflow-auto p-2">
          <h3 className="text-green-600 dark:text-green-400 mb-2 font-bold">Heap Memory ({memoryRefs.length})</h3>
          <div className="space-y-1">
            {memoryRefs.map((ref) => {
              // We need to cast to any to access the value since search returns IMemoryReference
              // and we want to see the value. In a real app, we'd use a proper typed accessor.
              // For debug view, we'll try to get the value if possible.
              let value: any = "???";
              try {
                // @ts-ignore - accessing internal get or using the typed ref if we knew the type
                if (runtime.memory.get) {
                   value = runtime.memory.get(ref as any);
                }
              } catch (e) {
                value = "Error";
              }

              return (
                <div key={ref.id} className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700/50">
                  <div className="flex justify-between mb-1">
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">{ref.type}</span>
                    <span className={`text-xs px-1 rounded ${ref.visibility === 'public' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {ref.visibility}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 dark:text-gray-500 text-[10px]">{ref.ownerId.split('-').pop()}</span>
                    <span className="text-gray-900 dark:text-white font-bold font-mono">{JSON.stringify(value)}</span>
                  </div>
                </div>
              );
            })}
             {memoryRefs.length === 0 && <div className="text-gray-400 dark:text-gray-600 italic">Heap empty</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
