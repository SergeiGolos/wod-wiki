// src/components/analyrics/EffortSummaryCard.tsx
import React from 'react';
import { ResultSpan } from '../../core/timer.types';
import { XMarkIcon } from '@heroicons/react/20/solid';

interface EffortSummaryCardProps {
  spansOptions: [ResultSpan, boolean][];
  selectedEffortFilter: string[];
  setSelectedEffortFilter: (effort: string) => void;
}

const EffortSummaryCard: React.FC<EffortSummaryCardProps> = ({ spansOptions, selectedEffortFilter, setSelectedEffortFilter }) => {  
  if (!spansOptions || spansOptions.length === 0 || !spansOptions[0][0].metrics || spansOptions[0][0].metrics.length === 0) {
    return null;
  }

  const uniqueEfforts = Array.from(new Set(spansOptions.map(span => span[0].metrics?.[0]?.effort).filter(Boolean)));

  const filteredSpans = selectedEffortFilter.length > 0
    ? spansOptions.filter(span => selectedEffortFilter.includes(span[0].metrics?.[0]?.effort))
    : spansOptions;

  if (!filteredSpans.length) {
    return (
      <div className="p-3 shadow-sm bg-gray-100 mb-3 rounded-md text-center text-gray-500">
        No data for selected effort(s).
      </div>
    );
  }

  const numberOfSets = filteredSpans.length;
  const totalReps = filteredSpans.reduce((total, span) => total + (span[0].metrics?.[0]?.repetitions?.value || 0), 0);

  const resistanceMetric = filteredSpans[0][0].metrics[0].resistance;
  const distanceMetric = filteredSpans[0][0].metrics[0].distance;
  const resistanceUnit = resistanceMetric?.unit;
  const distanceUnit = distanceMetric?.unit;

  const totalWeightValue = filteredSpans.reduce((total, span) => total + (span[0].metrics?.[0]?.resistance?.value || 0) * (span[0].metrics?.[0]?.repetitions?.value || 0), 0);
  const totalDistanceValue = filteredSpans.reduce((total, span) => total + (span[0].metrics?.[0]?.distance?.value || 0) * (span[0].metrics?.[0]?.repetitions?.value || 0), 0);

  const totalDurationMs = filteredSpans.reduce((total, span) => {
    const start = span[0].start?.timestamp?.getTime();
    const end = span[0].stop?.timestamp?.getTime();
    const duration = start && end && end > start ? end - start : 0;
    return total + duration;
  }, 0);

  const averageWeightUsedPerRep = totalReps > 0 ? totalWeightValue / totalReps : 0;
  const averageTimePerRepSeconds = totalReps > 0 ? (totalDurationMs) / totalReps : 0;

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
