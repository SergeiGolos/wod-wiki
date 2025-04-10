import React, { MutableRefObject, useEffect, useState } from 'react';

import { WodResults } from './WodResults';
import { EventsView } from './EventsView';
import { AnalyticsView } from './AnalyticsView';
import { TabSelector, TabOption } from './TabSelector';
import { ResultSpan, ITimerRuntime, RuntimeMetricEdit } from '@/core/timer.types';

interface ResultsDisplayProps {  
  results: ResultSpan[];
  runtime: MutableRefObject<ITimerRuntime | undefined>;
  edits: RuntimeMetricEdit[];
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({   
  results,
  runtime,
  edits
}) => {
  const [activeTab, setActiveTab] = useState<TabOption>('Efforts');  
  const [computed, setComputed] = useState<ResultSpan[]>([]);

  useEffect(() => {
    // Deep clone results to avoid mutating props
    const processedResults =[];
    // Apply edits to the cloned results
    for (const result of results) {
      processedResults.push(result.edit(edits));
    }
    
    setComputed(processedResults); // Update the state with processed results

  }, [results, edits]); // Dependencies: results and edits
  
  return (
    <div className="results-display">  
        
      <div className="mb-4">
          <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
          {activeTab === 'Grouped' && (
            <WodResults results={computed} runtime={runtime} />
          )}
          
          {activeTab === 'Efforts' && (
            <EventsView 
              results={computed} 
              runtime={runtime} 
            />
          )}
          
          {activeTab === 'Analytics' && (
            <AnalyticsView results={computed} runtime={runtime} />
          )}
        </div>      
    </div>
  );
};
