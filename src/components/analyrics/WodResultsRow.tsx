import React from 'react';
import { ResultSpan, MetricValue } from '@/core/timer.types';

interface ResultMetricItem {
  result: ResultSpan;
  effort: string;
  repetitions?: MetricValue;
  resistance?: MetricValue;
  distance?: MetricValue;
  duration: number;
  timestamp: number;
}

interface WodResultsRowProps {
  item: ResultMetricItem;
  index: number;
}

export const WodResultsRow: React.FC<WodResultsRowProps> = ({ item, index }) => {
  const result = item.result;
  const blockId = result.blockKey?.split('|')[0] || 'unknown';

  const repsDisplay = (item.repetitions?.value ?? 0) > 0 ? `${item.repetitions?.value}` : '-';
  const resistanceDisplay = item.resistance ? `${item.resistance.value}${item.resistance.unit}` : '-';
  const distanceDisplay = item.distance ? `${item.distance.value}${item.distance.unit}` : '-';


  return (
    <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50`}>
      <td className="pl-6 pr-3 py-2 text-sm text-gray-500 border-l-2 border-gray-200">
        {result.index || 'N/A'} (Block {blockId})
      </td>
      <td className="px-3 py-2 text-sm text-gray-500">
        {item.duration.toFixed(1)}s
      </td>
      <td className="px-3 py-2 text-sm text-gray-500">
        {repsDisplay}
      </td>
      <td className="px-3 py-2 text-sm text-gray-500">
        {resistanceDisplay}
      </td>
      <td className="px-3 py-2 text-sm text-gray-500">
        {distanceDisplay}
      </td>
    </tr>
  );
};
