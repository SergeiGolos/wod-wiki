import React from 'react';
import { ResultSpan } from '@/core/timer.types';

interface ResultMetricItem {
  result: ResultSpan;
  effort: string;
  repetitions: number;
  value: number;
  unit: string;
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
  
  // Determine if the value/unit is resistance or distance
  const isResistance = item.unit === 'lb' || item.unit === 'kg';
  const isDistance = item.unit === 'm' || item.unit === 'km';
  
  // Format values for display
  const resistance = isResistance && item.value > 0 ? `${item.value}${item.unit}` : '-';
  const distance = isDistance && item.value > 0 ? `${item.value}${item.unit}` : '-';
  
  return (
    <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50`}>
      <td className="pl-6 pr-3 py-2 text-sm text-gray-500 border-l-2 border-gray-200">
        {result.index || 'N/A'} (Block {blockId})
      </td>
      <td className="px-3 py-2 text-sm text-gray-500">
        {item.duration.toFixed(1)}s
      </td>
      <td className="px-3 py-2 text-sm text-gray-500">
        {item.repetitions > 0 ? `${item.repetitions}` : '-'}
      </td>
      <td className="px-3 py-2 text-sm text-gray-500">
        {resistance}
      </td>
      <td className="px-3 py-2 text-sm text-gray-500">
        {distance}
      </td>
    </tr>
  );
};
