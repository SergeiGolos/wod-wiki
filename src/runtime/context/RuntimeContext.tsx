import { createContext, useContext, ReactNode } from 'react';
import { IScriptRuntime } from '../contracts/IScriptRuntime';

/**
 * React Context for providing IScriptRuntime to components.
 * Components can use useRuntimeContext() to access runtime memory and state.
 */
const RuntimeContext = createContext<IScriptRuntime | undefined>(undefined);

export interface RuntimeProviderProps {
  runtime: IScriptRuntime;
  children: ReactNode;
}

/**
 * Provides IScriptRuntime context to child components.
 * Must wrap any components that need access to runtime memory or state.
 * 
 * @example
 * ```tsx
 * const runtime = new ScriptRuntime();
 * const script = parseWorkout('For Time: 30 Jumping Jacks');
 * runtime.execute(script);
 * 
 * return (
 *   <RuntimeProvider runtime={runtime}>
 *     <ClockAnchor blockKey="block-001" />
 *   </RuntimeProvider>
 * );
 * ```
 */
export const RuntimeProvider: React.FC<RuntimeProviderProps> = ({
  runtime,
  children
}) => {
  return (
    <RuntimeContext.Provider value={runtime}>
      {children}
    </RuntimeContext.Provider>
  );
};

/**
 * Hook to access the IScriptRuntime from context.
 * Must be used within a RuntimeProvider.
 * 
 * @throws Error if called outside RuntimeProvider
 * @returns IScriptRuntime instance
 */
export function useRuntimeContext(): IScriptRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) {
    throw new Error('useRuntimeContext must be used within RuntimeProvider');
  }
  return runtime;
}
