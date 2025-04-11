// src/components/analyrics/EffortSummaryCard.tsx
import React from 'react';
import { MetricValue, ResultSpan } from '../../core/timer.types'; // Assuming MetricValue is exported

interface EffortSummaryCardProps {
  spansOptions: [ResultSpan, boolean][];
  selectedEffortFilter: string | null;
  setSelectedEffortFilter: (filter: string | null) => void;
}

const EffortSummaryCard: React.FC<EffortSummaryCardProps> = ({ spansOptions, selectedEffortFilter, setSelectedEffortFilter }) => {  
  if (!spansOptions || spansOptions.length === 0 || !spansOptions[0][0].metrics || spansOptions[0][0].metrics.length === 0) {
    return null; // Or return a placeholder/error state
  }

  const effort = spansOptions[0][0].metrics[0].effort;
  const numberOfSets = spansOptions.length;
  const totalReps = spansOptions.reduce((total, span) => total + (span[0].metrics?.[0]?.repetitions?.value || 0), 0);

  // Extract units from the first span, assuming consistency for the effort
  const resistanceMetric = spansOptions[0][0].metrics[0].resistance;
  const distanceMetric = spansOptions[0][0].metrics[0].distance;
  const resistanceUnit = resistanceMetric?.unit;
  const distanceUnit = distanceMetric?.unit;

  const totalWeightValue = spansOptions.reduce((total, span) => total + (span[0].metrics?.[0]?.resistance?.value || 0) * (span[0].metrics?.[0]?.repetitions?.value || 0), 0);
  const totalDistanceValue = spansOptions.reduce((total, span) => total + (span[0].metrics?.[0]?.distance?.value || 0) * (span[0].metrics?.[0]?.repetitions?.value || 0), 0);

  // Calculate total duration
  const totalDurationMs = spansOptions.reduce((total, span) => {
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
    .filter(stat => stat.value !== undefined && stat.value !== null && stat.value > 0) // Filter out zero or undefined values
    .map(stat => ({
      ...stat,
      // Format numeric values, keeping integers as integers, decimals to 2 places
      displayValue: typeof stat.value === 'number'
        ? `${stat.value.toFixed(stat.value % 1 === 0 ? 0 : 2)}${stat.unit ? ` ${stat.unit}` : ''}`
        : stat.value.toString(),
    }));

  return (
    <div className="p-3 shadow-sm bg-gray-100 dark:bg-gray-700 mb-3 rounded-md"> 
      {/* Filter Display Area */} 
      {selectedEffortFilter && selectedEffortFilter === effort && (
        <div className="pb-2 mb-2 flex justify-end border-b border-gray-300 dark:border-gray-600"> 
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {selectedEffortFilter}
            <button
              type="button"
              className="ml-1.5 flex-shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white dark:text-blue-300 dark:hover:bg-blue-700 dark:hover:text-blue-100"
              onClick={() => setSelectedEffortFilter(null)}
            >
              <span className="sr-only">Remove {selectedEffortFilter} filter</span>
              <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
              </svg>
            </button>
          </span>
        </div>
      )}
      {/* Stats Grid */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-4 text-center"> 
        {stats.map((stat) => (
          <div key={stat.id} className="mx-auto flex flex-col"> 
            {/* Value - larger font, placed first visually */}
            <dd className="order-first text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              {stat.displayValue}
            </dd>
            {/* Label - smaller font, muted color */}
            <dt className="text-sm leading-6 text-gray-600 dark:text-gray-400"> 
              {stat.name}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default EffortSummaryCard;
