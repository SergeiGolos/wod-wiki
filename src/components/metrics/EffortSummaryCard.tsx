// src/components/metrics/EffortSummaryCard.tsx
import React from 'react';
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { XMarkIcon } from '@heroicons/react/20/solid';
import { MetricValue } from "@/core/MetricValue";

interface EffortSummaryCardProps {
  spansOptions: [RuntimeSpan, boolean][];
  selectedEffortFilter: string[];
  setSelectedEffortFilter: (effort: string) => void;
}

// Utility functions for extracting metric values from the new structure
const getMetricValue = (span: RuntimeSpan, metricType: 'repetitions' | 'resistance' | 'distance'): MetricValue | undefined => {
  for (const metric of span.metrics) {
    const value = metric.values.find(v => v.type === metricType);
    if (value) return value;
  }
  return undefined;
};

const calculateDurationMs = (span: RuntimeSpan): number => {
  if (!span.timeSpans || span.timeSpans.length === 0) return 0;
  
  return span.timeSpans.reduce((total, timeSpan) => {
    const start = timeSpan.start?.timestamp?.getTime();
    const stop = timeSpan.stop?.timestamp?.getTime();
    
    if (!start) return total;
    
    // If no stop time, use current time for running spans
    const endTime = stop || new Date().getTime();
    const duration = endTime > start ? endTime - start : 0;
    
    return total + duration;
  }, 0);
};

const EffortSummaryCard: React.FC<EffortSummaryCardProps> = ({ spansOptions, selectedEffortFilter, setSelectedEffortFilter }) => {  
  if (!spansOptions || spansOptions.length === 0 || !spansOptions[0][0].metrics || spansOptions[0][0].metrics.length === 0) {
    return null;
  }

  // Extract unique efforts from all metrics across all spans
  const uniqueEfforts = Array.from(new Set(
    spansOptions.flatMap(([span]) => 
      span.metrics.map(metric => metric.effort)
    ).filter(Boolean)
  ));

  const filteredSpans = selectedEffortFilter.length > 0
    ? spansOptions.filter(([span]) => 
        span.metrics.some(metric => selectedEffortFilter.includes(metric.effort))
      )
    : spansOptions;

  if (!filteredSpans.length) {
    return (
      <div className="p-3 shadow-sm bg-gray-100 mb-3 rounded-md text-center text-gray-500">
        No data for selected effort(s).
      </div>
    );
  }

  const numberOfSets = filteredSpans.length;
  
  // Calculate totals using the new metric structure
  const totalReps = filteredSpans.reduce((total, [span]) => {
    const repsValue = getMetricValue(span, 'repetitions');
    return total + (repsValue?.value || 0);
  }, 0);

  // Get units from first span that has the respective metrics
  let resistanceUnit = '';
  let distanceUnit = '';
  
  for (const [span] of filteredSpans) {
    if (!resistanceUnit) {
      const resistanceValue = getMetricValue(span, 'resistance');
      if (resistanceValue) resistanceUnit = resistanceValue.unit;
    }
    if (!distanceUnit) {
      const distanceValue = getMetricValue(span, 'distance');
      if (distanceValue) distanceUnit = distanceValue.unit;
    }
    if (resistanceUnit && distanceUnit) break;
  }

  const totalWeightValue = filteredSpans.reduce((total, [span]) => {
    const resistanceValue = getMetricValue(span, 'resistance');
    const repsValue = getMetricValue(span, 'repetitions');
    const weight = resistanceValue?.value || 0;
    const reps = repsValue?.value || 0;
    return total + (weight * reps);
  }, 0);

  const totalDistanceValue = filteredSpans.reduce((total, [span]) => {
    const distanceValue = getMetricValue(span, 'distance');
    const repsValue = getMetricValue(span, 'repetitions');
    const distance = distanceValue?.value || 0;
    const reps = repsValue?.value || 0;
    return total + (distance * reps);
  }, 0);

  const totalDurationMs = filteredSpans.reduce((total, [span]) => {
    return total + calculateDurationMs(span);
  }, 0);
  const averageWeightUsedPerRep = totalReps > 0 ? totalWeightValue / totalReps : 0;
  const averageTimePerRepSeconds = totalReps > 0 ? (totalDurationMs / 1000) / totalReps : 0;

  const stats = [
    { id: 'sets', name: 'Sets', value: numberOfSets },
    { id: 'reps', name: 'Total Reps', value: totalReps },
    { id: 'weight', name: 'Total Weight', value: totalWeightValue, unit: resistanceUnit },
    { id: 'avgWeight', name: 'Avg Wt/Rep', value: averageWeightUsedPerRep, unit: resistanceUnit },
    { id: 'distance', name: 'Total Distance', value: totalDistanceValue, unit: distanceUnit },
    { id: 'avgTime', name: 'Avg Time/Rep', value: averageTimePerRepSeconds, unit: 's' },
  ]
    .filter(stat => stat.value !== undefined && stat.value !== null && stat.value > 0)
    .map(stat => ({
      ...stat,
      displayValue: typeof stat.value === 'number'
        ? `${stat.value.toFixed(stat.value % 1 === 0 ? 0 : 2)}${stat.unit ? ` ${stat.unit}` : ''}`
        : '',
    }));

  return (
    <div className="p-3 shadow-sm bg-gray-100 mb-3 rounded-md">
      {/* Filter Selection Area */}
      <div className="pb-2 mb-2 flex flex-row items-center gap-0.5 border-b border-gray-300 justify-end">
        {uniqueEfforts.map((effortType, idx) => {
          const selected = selectedEffortFilter.includes(effortType);
          return (
            <React.Fragment key={effortType}>
              {idx > 0 && (
                <span className="mx-1 h-4 border-l border-gray-200 opacity-60" />
              )}
              <button
                type="button"
                className={`group relative px-2 py-0.5 bg-transparent border-none rounded-none text-sm font-normal focus:outline-none
                  ${selected
                    ? 'text-blue-700 underline underline-offset-4 decoration-2'
                    : 'text-gray-700 hover:underline hover:text-blue-700'}
                `}
                onClick={() => setSelectedEffortFilter(effortType)}
              >
                <span className="flex items-center">
                  {effortType}
                  {selected && (
                    <span className="ml-1 flex items-center justify-center">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 border border-gray-300">
                        <XMarkIcon className="w-2.5 h-2.5 text-gray-400 group-hover:text-red-400" aria-hidden="true" />
                      </span>
                    </span>
                  )}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
      {/* Stats Grid */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-4 text-center">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white rounded-lg p-2 shadow text-gray-800">
            <dt className="text-xs font-medium text-gray-500">{stat.name}</dt>
            <dd className="mt-1 text-lg font-semibold">{stat.displayValue}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default EffortSummaryCard;
