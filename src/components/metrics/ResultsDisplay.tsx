import React, { MutableRefObject, useState, useEffect } from 'react';

import { EventsView } from './EventsView';
import { AnalyticsView } from './AnalyticsView';
import { TabSelector, TabOption } from './TabSelector';
import { RuntimeMetricEdit } from "@/core/RuntimeMetricEdit";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import EffortSummaryCard from './EffortSummaryCard'; // Import the new component
import { cn } from '@/core/utils';
import { ResultSpan } from '@/core/ResultSpan';

interface ResultsDisplayProps {  
  results: ResultSpan[];
  runtime: MutableRefObject<ITimerRuntime | undefined>;
  edits: RuntimeMetricEdit[];
  className?: string;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({   
  results,
  runtime,
  edits,
  className = ""
}) => {
  const [computed, setComputed] = useState<[ResultSpan,  boolean][]>([]);
  const [activeTab, setActiveTab] = useState<TabOption>('Efforts');  
  const [selectedEffortFilter, setSelectedEffortFilter] = useState<string[]>([]);    
  const toggleEffortFilter = (effort: string) => {
    setSelectedEffortFilter((prev) =>
      prev.includes(effort) ? prev.filter(e => e !== effort) : [...prev, effort]
    );
  };

  useEffect(() => {
    if (!results) return;
    const processedResults: [ResultSpan, boolean][] = [];
    for (const result of results) {
      let hidden = false;
      if (selectedEffortFilter.length > 0 && !selectedEffortFilter.includes(result.metrics?.[0]?.effort)) {        
        hidden = true;
      }
      // todo: DEAL WITH THE type converstion.
       processedResults.push([result, hidden]);
    }    
    setComputed(processedResults); 

  }, [results, edits, selectedEffortFilter]); 

  return (
    <div className={cn("results-display", className)}>  
        
      <div className="mb-4">
      <EffortSummaryCard 
              spansOptions={computed} 
              selectedEffortFilter={selectedEffortFilter} 
              setSelectedEffortFilter={toggleEffortFilter}
            />
          
          <div className="flex justify-between items-center">
            <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
          </div>          
        {activeTab === 'Efforts' && (<>                                              
            <EventsView 
              results={computed} 
              onEffortClick={toggleEffortFilter}                 
            />   
          </>)}
          
          {activeTab === 'Analytics' && (
            <AnalyticsView results={computed} runtime={runtime} />
          )}
        </div>      
    </div>
  );
};
