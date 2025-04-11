import React, { MutableRefObject, useState, useEffect } from 'react';

import { EventsView } from './EventsView';
import { AnalyticsView } from './AnalyticsView';
import { TabSelector, TabOption } from './TabSelector';
import { ResultSpan, ITimerRuntime, RuntimeMetricEdit } from '@/core/timer.types';
import EffortSummaryCard from './EffortSummaryCard'; // Import the new component

interface ResultsDisplayProps {  
  results: ResultSpan[];
  runtime: MutableRefObject<ITimerRuntime | undefined>;
  edits: RuntimeMetricEdit[];
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({   
  results,
  runtime,
  edits,
}) => {
  const [computed, setComputed] = useState<[ResultSpan, boolean][]>([]);
  const [activeTab, setActiveTab] = useState<TabOption>('Efforts');  
  const [selectedEffortFilter, setSelectedEffortFilter] = useState<string | null>(null);  

  useEffect(() => {
    // Deep clone results to avoid mutating props
    const processedResults =[];
    // Apply edits to the cloned results    
    for (const result of results) {
      let hidden = false;
      if (selectedEffortFilter && result.metrics?.[0]?.effort !== selectedEffortFilter) {        
        hidden = true;
      }
      processedResults.push([result.edit(edits), hidden]);
    }    
    setComputed(processedResults); // Update the state with processed results

  }, [results, edits, selectedEffortFilter]); // Dependencies: results and edits

  // Calculate summary metrics for the selected effort filter
  
  return (
    <div className="results-display">  
        
      <div className="mb-4">
          {/* Wrap TabSelector and Filter Display in a flex container */}
          <div className="flex justify-between items-center">
            <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
          </div> {/* End of flex container */}          
          {/* Tab Content */}
        {activeTab === 'Efforts' && (<>            
          {selectedEffortFilter && (
            <EffortSummaryCard 
              spansOptions={computed} 
              selectedEffortFilter={selectedEffortFilter} 
              setSelectedEffortFilter={setSelectedEffortFilter}
            />
          )}
              
            <EventsView 
              results={computed} 
              runtime={runtime} 
              onEffortClick={setSelectedEffortFilter}                 
            />   
          </>)}
          
          {activeTab === 'Analytics' && (
            <AnalyticsView results={computed} runtime={runtime} />
          )}
        </div>      
    </div>
  );
};
