import React, { MutableRefObject, useEffect, useState } from 'react';

import { WodResults } from './WodResults';
import { EventsView } from './EventsView';
import { AnalyticsView } from './AnalyticsView';
import { TabSelector, TabOption } from './TabSelector';
import { ResultSpan, ITimerRuntime } from '@/core/timer.types';


interface ResultsDisplayProps {  
  results: ResultSpan[];
  runtime: MutableRefObject<ITimerRuntime | undefined>;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({   
  results,
  runtime
}) => {
  const [activeTab, setActiveTab] = useState<TabOption>('Efforts');
  const [statementCounter, setStatementCounter] = useState<number>(0);
  
  useEffect(() => {
    if (runtime.current) {
      setStatementCounter(
        (runtime.current?.script?.leafs?.length ?? 0) + statementCounter
      );
    }
  }, [results, runtime]);
  
  return (
    <div className="results-display">  
        
      <div className="mb-4">
          <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
          {!results || results.length === 0 && (
            <div className="text-gray-500 text-sm p-4">Run the timers to log efforts.</div>
          )}
          {activeTab === 'Grouped' && (
            <WodResults results={results} runtime={runtime} />
          )}
          
          {activeTab === 'Efforts' && (
            <EventsView results={results} runtime={runtime} />
          )}
          
          {activeTab === 'Analytics' && (
            <AnalyticsView results={results} runtime={runtime} />
          )}
        </div>      
    </div>
  );
};
