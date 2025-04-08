import React, { MutableRefObject } from 'react';
import { ResultSpan, ITimerRuntime } from '@/core/timer.types';

interface AnalyticsViewProps {
  results: ResultSpan[];
  runtime: MutableRefObject<ITimerRuntime | undefined>;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ results, runtime }) => {
  return (
    <div className="analytics-view">
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
        <h3 className="text-lg font-medium text-gray-700 mb-2">Analytics View</h3>
        <p className="text-gray-500">
          Advanced analytics and calculations will be implemented in this tab.
        </p>
      </div>
    </div>
  );
};
