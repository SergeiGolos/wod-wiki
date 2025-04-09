import React, { useState } from 'react';
import { ResultSpan } from '@/core/timer.types';

interface WodTableProps {
  results: ResultSpan[];
}

export const WodTable: React.FC<WodTableProps> = ({ results }) => {
  // State to track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Extract all metrics from result spans
  const exerciseMetrics = results.flatMap(result => 
    result.metrics.map(metric => ({
      blockKey: result.blockKey,
      index: result.index,
      round: result.stack?.[0] || 0,
      effort: metric.effort,
      repetitions: metric.repetitions,
      value: metric.value,
      unit: metric.unit,
      duration: result.duration ? result.duration() / 1000 : 0 // duration in seconds
    }))
  );

  // Group metrics by effort type
  const groupedByEffort = exerciseMetrics.reduce((acc, metric) => {
    if (!acc[metric.effort]) {
      acc[metric.effort] = [];
    }
    acc[metric.effort].push(metric);
    return acc;
  }, {} as Record<string, typeof exerciseMetrics>);

  // Calculate totals for each effort group
  const effortGroups = Object.entries(groupedByEffort).map(([effort, metrics]) => {
    const totalReps = metrics.reduce((sum, m) => sum + (m.repetitions?.value ?? 0), 0);
    const totalTime = metrics.reduce((sum, m) => sum + m.duration, 0).toFixed(1);
    const avgWeight = metrics.length > 0 ? 
      metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length : 
      0;
    
    return {
      effort,
      metrics,
      totalReps,
      totalTime,
      avgWeight: avgWeight > 0 ? `${avgWeight}${metrics[0].unit}` : '-'
    };
  });

  // Toggle section expansion
  const toggleSection = (effort: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [effort]: !prev[effort]
    }));
  };

  // Check if a section is expanded
  const isSectionExpanded = (effort: string) => {
    // Default to expanded if not explicitly collapsed
    return expandedSections[effort] !== false;
  };

  return (
    <div className="overflow-x-auto px-3 py-1">
      <div className='text-lg font-semibold text-gray-700 mb-3'>
      Training Metrics
      </div>
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
              Round
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
              Exercise
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
              Reps
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
              Weight
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {effortGroups.map((group, groupIndex) => [
            // Group header with totals
            <tr 
              key={`group-${group.effort}`} 
              className="bg-gray-100 font-semibold cursor-pointer hover:bg-gray-200"
              onClick={() => toggleSection(group.effort)}
            >
              <td className="px-3 py-2 text-sm text-gray-700">
                <span className="inline-block w-4 mr-1">
                  {isSectionExpanded(group.effort) ? '▼' : '►'}
                </span>
                Total
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">
                {group.effort}
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">
                {group.totalReps}
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">
                {group.avgWeight}
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">
                {group.totalTime}s
              </td>
            </tr>,
            // Individual instances (only shown if section is expanded)
            ...(isSectionExpanded(group.effort) ? 
              group.metrics.map((metric, index) => (
                <tr key={`${group.effort}-${index}`} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200 pl-8">
                    {metric.round}
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200">
                    {metric.effort}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                    {(metric.repetitions?.value ?? 0) > 0 ? metric.repetitions.value : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                    {metric.value > 0 ? `${metric.value}${metric.unit}` : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {metric.duration.toFixed(1)}s
                  </td>
                </tr>
              ))
              : []
            )
          ])}
        </tbody>
      </table>
    </div>
  );
};
