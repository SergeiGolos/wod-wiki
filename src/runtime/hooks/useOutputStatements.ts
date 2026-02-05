import { useState, useEffect } from 'react';
import { useRuntimeContext } from '../context/RuntimeContext';
import { IOutputStatement } from '../../core/models/OutputStatement';

/**
 * Hook that subscribes to output statements and provides workout history.
 * Output statements are generated when blocks complete and can be used
 * for analytics, workout history, and performance tracking.
 *
 * @returns Array of all output statements generated during the workout
 *
 * @example
 * ```tsx
 * function WorkoutHistory() {
 *   const outputs = useOutputStatements();
 *
 *   return (
 *     <div>
 *       <h2>Workout History ({outputs.length} events)</h2>
 *       {outputs.map((output, index) => (
 *         <div key={index}>
 *           {output.outputType}: {output.sourceBlockKey}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOutputStatements(): IOutputStatement[] {
  const runtime = useRuntimeContext();
  const [outputs, setOutputs] = useState<IOutputStatement[]>(runtime.getOutputStatements());

  useEffect(() => {
    // Subscribe to new output statements
    const unsubscribe = runtime.subscribeToOutput(() => {
      // Get all outputs when a new one is added
      setOutputs(runtime.getOutputStatements());
    });

    return unsubscribe;
  }, [runtime]);

  return outputs;
}
