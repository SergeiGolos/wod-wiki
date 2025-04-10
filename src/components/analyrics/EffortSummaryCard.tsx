// src/components/analyrics/EffortSummaryCard.tsx
import React from 'react';
import { MetricValue, ResultSpan } from '../../core/timer.types'; // Assuming MetricValue is exported

interface EffortSummaryCardProps {
  spans: ResultSpan[];
}

const EffortSummaryCard: React.FC<EffortSummaryCardProps> = ({ spans }) => {
  if (!spans || spans.length === 0 || !spans[0].metrics || spans[0].metrics.length === 0) {
    return null; // Or return a placeholder/error state
  }

  const effort = spans[0].metrics[0].effort;
  const numberOfSets = spans.length;
  const totalReps = spans.reduce((total, span) => total + (span.metrics?.[0]?.repetitions?.value || 0), 0);

  // Extract units from the first span, assuming consistency for the effort
  const resistanceMetric = spans[0].metrics[0].resistance;
  const distanceMetric = spans[0].metrics[0].distance;
  const resistanceUnit = resistanceMetric?.unit;
  const distanceUnit = distanceMetric?.unit;

  const totalWeightValue = spans.reduce((total, span) => total + (span.metrics?.[0]?.resistance?.value || 0) * (span.metrics?.[0]?.repetitions?.value || 0), 0);
  const totalDistanceValue = spans.reduce((total, span) => total + (span.metrics?.[0]?.distance?.value || 0) * (span.metrics?.[0]?.repetitions?.value || 0), 0);

  // Calculate total duration
  const totalDurationMs = spans.reduce((total, span) => {
    const start = span.start?.timestamp?.getTime();
    const end = span.stop?.timestamp?.getTime();
    const duration = start && end && end > start ? end - start : 0;
    return total + duration;
  }, 0);

  // Calculate averages only if there are reps
  const averageWeightUsedPerRep = totalReps > 0 ? totalWeightValue / totalReps : 0;
  const averageTimePerRepSeconds = totalReps > 0 ? (totalDurationMs / 1000) / totalReps : 0;

  const renderMetric = (label: string, value: string | number | undefined, unit?: string) => {
    if (value === undefined || value === null || (typeof value === 'number' && value <= 0)) return null;
    const displayValue = typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 2) : value;
    return (
      <div className="flex items-center mb-1">
        {/* Made label bold */}
        <span className="w-1/2 text-sm text-right font-bold text-gray-600 dark:text-gray-400">{label}:</span>
        {/* Made value normal weight */}
        <span className="pl-2 text-sm text-gray-800 dark:text-gray-200">
          {displayValue} {unit}
        </span>
      </div>
    );
  };

  return (
    <div className="p-3 shadow-sm bg-gray-100 dark:bg-gray-700 mb-3">      
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {renderMetric('Sets', numberOfSets)}
        {renderMetric('Total Reps', totalReps)}
        {renderMetric('Total Weight', totalWeightValue, resistanceUnit)}
        {renderMetric('Avg Wt Used/Rep', averageWeightUsedPerRep, resistanceUnit)}
        {renderMetric('Total Distance', totalDistanceValue, distanceUnit)}
        {renderMetric('Avg Time/Rep', averageTimePerRepSeconds, 's')}
      </div>
    </div>
  );
};

export default EffortSummaryCard;
