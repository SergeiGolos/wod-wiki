import React, { MutableRefObject, useState, useEffect, useMemo } from 'react';

import { WodResults } from './WodResults';
import { EventsView } from './EventsView';
import { AnalyticsView } from './AnalyticsView';
import { TabSelector, TabOption } from './TabSelector';
import { ResultSpan, ITimerRuntime, RuntimeMetricEdit } from '@/core/timer.types';
import EffortSummaryCard from './EffortSummaryCard'; // Import the new component
import { MetricValue } from '../../core/timer.types'; // Ensure MetricValue is available

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
  const [computed, setComputed] = useState<ResultSpan[]>([]);
  const [activeTab, setActiveTab] = useState<TabOption>('Efforts');  
  const [selectedEffortFilter, setSelectedEffortFilter] = useState<string | null>(null);

  useEffect(() => {
    // Deep clone results to avoid mutating props
    const processedResults =[];
    // Apply edits to the cloned results
    for (const result of results) {
      if (selectedEffortFilter && result.metrics?.[0]?.effort !== selectedEffortFilter) {
        continue;
      }
      processedResults.push(result.edit(edits));
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
            
            {/* Filter Display Area - removed mt-2 and justify-end */}
            {selectedEffortFilter && (
              <div className="pr-2">
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {selectedEffortFilter}
                  <button 
                    type="button"
                    className="ml-1.5 flex-shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                    onClick={() => setSelectedEffortFilter(null)} // Clear filter on click
                  >
                    <span className="sr-only">Remove filter</span>
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
              </div>
            )}
          </div> {/* End of flex container */}          
          {/* Tab Content */}
        {activeTab === 'Efforts' && (<>            
          {selectedEffortFilter && (
            <EffortSummaryCard spans={computed}/>
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
