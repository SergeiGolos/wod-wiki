import React, { useState } from 'react';
import { WodWiki } from './WodWiki';
import { WodRows } from './WodRows';

interface WodRunnerProps {
  initialContent?: string;
  current?: number;
}

export const WodRunner: React.FC<WodRunnerProps> = ({ 
  initialContent = '',
  current = 0 
}) => {
  const [outcome, setOutcome] = useState<any[]>([]);

  const handleValueChange = (value: any) => {
    if (value?.outcome) {
      // If we get an empty outcome array, show empty state
      if (value.outcome.length === 0) {
        setOutcome([]);
        return;
      }
      
      // Only update if we're getting real parsed data, not just the compiling status
      if (!(value.outcome.length === 1 && value.outcome[0].type === 'notification')) {
        setOutcome(value.outcome);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <WodWiki 
        code={initialContent}
        current={current}
        onValueChange={handleValueChange}
      />
      <WodRows 
        data={outcome}
        current={current}
      />
    </div>
  );
};
