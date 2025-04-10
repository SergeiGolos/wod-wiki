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
  const [computed, setComputed] = useState<ResultSpan[]>([]);
  const [activeTab, setActiveTab] = useState<TabOption>('Efforts');  
  const [selectedEffortFilter, setSelectedEffortFilter] = useState<string | null>(null);
  const [filteredCount, setFilteredCount] = useState(0);

  useEffect(() => {
    // Deep clone results to avoid mutating props
    const processedResults =[];
    // Apply edits to the cloned results
    let count = 0;
    for (const result of results) {
      if (selectedEffortFilter && result.metrics?.[0]?.effort !== selectedEffortFilter) {
        count++;
        continue;
      }
      processedResults.push(result.edit(edits));
    }
    setFilteredCount(count);
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
             {filteredCount > 0 && (
              <div className="bg-gray-100 dark:bg-gray-800 p-2 flex justify-center items-center text-center"> 
                    <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">{filteredCount} {filteredCount === 1 ? 'record is' : 'records are'} hidden by filter:</span>
                    {/* Replaced button with badge style */}
                    <span className="inline-flex items-center px-1 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      <button 
                        type="button"
                        className="flex-shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
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
          </>)}
          
          {activeTab === 'Analytics' && (
            <AnalyticsView results={computed} runtime={runtime} />
          )}
        </div>      
    </div>
  );
};
