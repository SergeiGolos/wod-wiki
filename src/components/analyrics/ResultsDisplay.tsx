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
    const processedResults = structuredClone(results);

    // Apply edits to the cloned results
    for (const edit of edits) {
      const targetSpan = processedResults.find(
        (span) => span.blockKey === edit.blockKey && span.index === edit.index
      );

      // Apply edit if span exists and has metrics
      if (targetSpan && targetSpan.metrics.length > 0) {
        // Assumption: Apply edit to the first metric in the span
        const targetMetric = targetSpan.metrics[0];

        switch (edit.metricType) {
          case 'repetitions':
            targetMetric.repetitions = edit.newValue;
            break;
          case 'resistance':
            targetMetric.resistance = edit.newValue;
            break;
          case 'distance':
            targetMetric.distance = edit.newValue;
            break;
          default:
            console.warn('Unknown metricType in edit:', edit.metricType);
        }
      } else {
        // Optional: Log if an edit targets a non-existent span/metric
        // console.warn('Edit target not found or span has no metrics:', edit);
      }
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
