import React, { useState } from 'react';
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { MetricValue } from "@/core/MetricValue";

interface WodTableProps {
  results: RuntimeSpan[];
}

// Define a structured metric item interface matching the new structure
interface ExerciseMetricItem {
  blockKey?: string;
  index?: number;
  round: number;
  effort: string;
  repetitions: number;
  resistance?: MetricValue;
  distance?: MetricValue;
  duration: number;
}

export const WodTable: React.FC<WodTableProps> = ({ results }) => {
  // State to track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Extract all metrics from result spans with the new structure
  const exerciseMetrics = results.flatMap(result => 
    result.metrics.map(metric => ({
      blockKey: result.blockKey,
      index: result.index,
      round: result.stack?.[0] || 0,
      effort: metric.effort,
      repetitions: metric.repetitions,
      resistance: metric.resistance,
      distance: metric.distance,
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
  }, {} as Record<string, ExerciseMetricItem[]>);

  // Calculate totals for each effort group
  const effortGroups = Object.entries(groupedByEffort).map(([effort, metrics]) => {
    const totalReps = metrics.reduce((sum, m) => sum + (m.repetitions?.value ?? 0), 0);
    const totalTime = metrics.reduce((sum, m) => sum + m.duration, 0).toFixed(1);
    
    // Calculate average resistance if present
    const resistanceMetrics = metrics.filter(m => m.resistance?.value);
    const avgResistance = resistanceMetrics.length > 0 
      ? resistanceMetrics.reduce((sum, m) => sum + (m.resistance?.value || 0), 0) / resistanceMetrics.length 
      : 0;
    const resistanceUnit = resistanceMetrics.length > 0 ? resistanceMetrics[0].resistance?.unit || '' : '';
    
    // Calculate average distance if present
    const distanceMetrics = metrics.filter(m => m.distance?.value);
    const avgDistance = distanceMetrics.length > 0 
      ? distanceMetrics.reduce((sum, m) => sum + (m.distance?.value || 0), 0) / distanceMetrics.length 
      : 0;
    const distanceUnit = distanceMetrics.length > 0 ? distanceMetrics[0].distance?.unit || '' : '';
    
    return {
      effort,
      metrics,
      totalReps,
      totalTime,
      avgResistance: avgResistance > 0 ? `${avgResistance.toFixed(1)}${resistanceUnit}` : '-',
      avgDistance: avgDistance > 0 ? `${avgDistance.toFixed(1)}${distanceUnit}` : '-'
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

  // Format metric value helper
  const formatMetricValue = (metricValue?: MetricValue): string => {
    return metricValue && metricValue.value > 0 
      ? `${metricValue.value}${metricValue.unit}` 
      : '-';
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
              Resistance
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-300">
              Distance
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
                {group.avgResistance}
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">
                {group.avgDistance}
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
                    {formatMetricValue(metric.resistance)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200">
                    {formatMetricValue(metric.distance)}
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
