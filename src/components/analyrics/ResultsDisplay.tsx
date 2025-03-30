import React, { MutableRefObject, useEffect, useState } from 'react';

import { WodResults } from './WodResults';
import { WodResultBlock } from '@/core/timer.types';
import { TimerRuntime } from '@/core/runtime/timer.runtime';



interface ResultsDisplayProps {  
  results: WodResultBlock[];
  runtime: MutableRefObject<TimerRuntime | undefined>;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({   
  results,
  runtime
}) => {
  
  const [statementCounter, setStatementCounter] = useState<number>(0);
  useEffect(() => {
    if (runtime.current) {
      setStatementCounter(
        (runtime.current?.script?.leafs?.length ?? 0) + statementCounter
      );
    }
  }, [results, runtime]);
  
  return (
    <div className="results-display">
      <div>{statementCounter}</div>
      {results && results.length > -1 && (        
        <div className="mb-4">
          <WodResults results={results} runtime={runtime} />
        </div>
      )}        
    </div>
  );
};
