// src/components/analyrics/EffortSummaryCard.tsx
import React from 'react';
import { MetricValue, ResultSpan } from '../../core/timer.types'; // Assuming MetricValue is exported

interface EffortSummaryCardProps {
  spansOptions: [ResultSpan, boolean][];
  selectedEffortFilter: string[];
  setSelectedEffortFilter: (effort: string) => void;
}

const EffortSummaryCard: React.FC<EffortSummaryCardProps> = ({ spansOptions, selectedEffortFilter, setSelectedEffortFilter }) => {  
  if (!spansOptions || spansOptions.length === 0 || !spansOptions[0][0].metrics || spansOptions[0][0].metrics.length === 0) {
    return null; // Or return a placeholder/error state
  }

  // Gather all unique efforts from spansOptions
  const uniqueEfforts = Array.from(new Set(spansOptions.map(span => span[0].metrics?.[0]?.effort).filter(Boolean)));

  // Filtered spans: if filter is active, only those efforts; otherwise all
  const filteredSpans = selectedEffortFilter.length > 0
    ? spansOptions.filter(span => selectedEffortFilter.includes(span[0].metrics?.[0]?.effort))
    : spansOptions;

  // If no filtered spans, show a message
  if (!filteredSpans.length) {
    return (
      <div className="p-3 shadow-sm bg-gray-100 dark:bg-gray-700 mb-3 rounded-md text-center text-gray-500 dark:text-gray-300">
        No data for selected effort(s).
      </div>
    );
  }

  // Use first filtered span for effort name, units, etc.
  const numberOfSets = filteredSpans.length;
  const totalReps = filteredSpans.reduce((total, span) => total + (span[0].metrics?.[0]?.repetitions?.value || 0), 0);

  const resistanceMetric = filteredSpans[0][0].metrics[0].resistance;
  const distanceMetric = filteredSpans[0][0].metrics[0].distance;
  const resistanceUnit = resistanceMetric?.unit;
  const distanceUnit = distanceMetric?.unit;

  const totalWeightValue = filteredSpans.reduce((total, span) => total + (span[0].metrics?.[0]?.resistance?.value || 0) * (span[0].metrics?.[0]?.repetitions?.value || 0), 0);
  const totalDistanceValue = filteredSpans.reduce((total, span) => total + (span[0].metrics?.[0]?.distance?.value || 0) * (span[0].metrics?.[0]?.repetitions?.value || 0), 0);

  // Calculate total duration
  const totalDurationMs = filteredSpans.reduce((total, span) => {
    const start = span[0].start?.timestamp?.getTime();
    const end = span[0].stop?.timestamp?.getTime();
    const duration = start && end && end > start ? end - start : 0;
    return total + duration;
  }, 0);

  // Calculate averages only if there are reps
  const averageWeightUsedPerRep = totalReps > 0 ? totalWeightValue / totalReps : 0;
  const averageTimePerRepSeconds = totalReps > 0 ? (totalDurationMs / 1000) / totalReps : 0;

  // Prepare stats array for rendering
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
        : stat.value.toString(),
    }));

  return (
    <div className="p-3 shadow-sm bg-gray-100 dark:bg-gray-700 mb-3 rounded-md"> 
      {/* Filter Selection Area */}
      <div className="pb-2 mb-2 flex flex-wrap gap-2 border-b border-gray-300 dark:border-gray-600 justify-end">
        {uniqueEfforts.map(effortType => {
          const selected = selectedEffortFilter.includes(effortType);
          return (
            <button
              key={effortType}
              type="button"
              className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium border transition-colors ${selected ? 'bg-blue-600 text-white border-blue-700' : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'} hover:bg-blue-200 dark:hover:bg-blue-800`}
              onClick={() => setSelectedEffortFilter(effortType)}
            >
              {effortType}
              {selected && (
                <svg className="ml-1 h-3 w-3" stroke="currentColor" fill="none" viewBox="0 0 8 8"><path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" /></svg>
              )}
            </button>
          );
        })}
      </div>
      {/* Stats Grid */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-4 text-center"> 
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow text-gray-800 dark:text-gray-100">
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-300">{stat.name}</dt>
            <dd className="mt-1 text-lg font-semibold">{stat.displayValue}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default EffortSummaryCard;
