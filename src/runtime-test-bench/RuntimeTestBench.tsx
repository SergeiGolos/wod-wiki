import React, { useEffect, useCallback, useRef } from 'react';
import { useTestBenchShortcuts } from './hooks/useTestBenchShortcuts';
import { useTestBenchRuntime } from './hooks/useTestBenchRuntime';
import { RuntimeTestBenchProps } from './types/interfaces';
import { globalParser } from './services/testbench-services';
import { TestBenchProvider, useTestBenchContext } from './context/TestBenchContext';
import { TestBenchLayout } from './components/TestBenchLayout';

/**
 * Inner component to consume context and hooks
 */
const RuntimeTestBenchInner: React.FC<{
  onCodeChange?: (code: string) => void;
  className?: string;
}> = ({ onCodeChange, className = '' }) => {
  const { state, dispatch } = useTestBenchContext();
  const { code, parseResults } = state;

  const parser = globalParser;

  const { runtime, execution, compile, updateSnapshot, resetRuntime } = useTestBenchRuntime({
    dispatch,
  });
  const { status, elapsedTime } = execution;

  const parseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCodeChange = (newCode: string) => {
    dispatch({ type: 'SET_CODE', payload: newCode });
    onCodeChange?.(newCode);

    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current);
    }

    dispatch({ type: 'SET_PARSE_RESULTS', payload: { ...parseResults, status: 'parsing' } });

    parseTimerRef.current = setTimeout(() => {
      try {
        const startTime = performance.now();
        const script = parser.read(newCode);
        const parseTime = performance.now() - startTime;

        dispatch({
          type: 'SET_PARSE_RESULTS', payload: {
            statements: script.statements,
            errors: (script.errors || []).map((err: any) => ({
              line: err.token?.startLine || 0,
              column: err.token?.startColumn || 0,
              message: err.message || 'Parse error',
              severity: 'error' as const
            })),
            warnings: [],
            status: (script.errors && script.errors.length > 0) ? 'error' : 'success',
            metadata: {
              parseTime,
              statementCount: script.statements.length,
              tokenCount: 0
            }
          }
        });
      } catch (error: any) {
        dispatch({
          type: 'SET_PARSE_RESULTS', payload: {
            ...parseResults,
            status: 'error',
            errors: [{
              line: 0,
              column: 0,
              message: error?.message || 'Unknown parse error',
              severity: 'error'
            }]
          }
        });
      }
    }, 500);

    if (runtime) {
      updateSnapshot();
    }
  };

  useEffect(() => {
    return () => {
      if (parseTimerRef.current) {
        clearTimeout(parseTimerRef.current);
      }
    };
  }, []);

  const handleCompile = useCallback(() => {
    try {
      if (parseResults.statements.length === 0) {
        dispatch({
          type: 'ADD_LOG', payload: {
            id: Date.now().toString(),
            timestamp: Date.now(),
            message: 'No statements to compile',
            level: 'warning'
          }
        });
        return;
      }

      const newRuntime = compile(code, parseResults.statements as any, parseResults.errors as any);

      if (!newRuntime) {
        dispatch({
          type: 'ADD_LOG', payload: {
            id: Date.now().toString(),
            timestamp: Date.now(),
            message: 'Compilation failed - no root block created',
            level: 'error'
          }
        });
        return;
      }

      const rootBlock = newRuntime.stack.current;
      dispatch({
        type: 'ADD_LOG', payload: {
          id: Date.now().toString(),
          timestamp: Date.now(),
          message: `Compilation successful. Root block type: ${rootBlock?.blockType}, Stack depth: ${newRuntime.stack.count}`,
          level: 'success'
        }
      });
    } catch (error: any) {
      dispatch({
        type: 'ADD_LOG', payload: {
          id: Date.now().toString(),
          timestamp: Date.now(),
          message: `Compilation error: ${error.message || 'Unknown error'}`,
          level: 'error'
        }
      });
    }
  }, [parseResults, code, compile, dispatch]);

  // Only re-compile when the parse timestamp changes
  useEffect(() => {
    if (parseResults.status === 'success' && parseResults.statements.length > 0) {
      handleCompile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseResults.metadata?.parseTime]);

  const handleExecute = useCallback(() => {
    if (!runtime) {
      dispatch({
        type: 'ADD_LOG', payload: {
          id: Date.now().toString(),
          timestamp: Date.now(),
          message: 'No runtime available. Compile first.',
          level: 'error'
        }
      });
      return;
    }

    execution.start();
    updateSnapshot();

    dispatch({
      type: 'ADD_LOG', payload: {
        id: Date.now().toString(),
        timestamp: Date.now(),
        message: 'Execution started',
        level: 'info'
      }
    });
  }, [runtime, execution.start]);

  const handlePause = useCallback(() => {
    execution.pause();
    updateSnapshot();

    dispatch({
      type: 'ADD_LOG', payload: {
        id: Date.now().toString(),
        timestamp: Date.now(),
        message: 'Execution paused',
        level: 'info'
      }
    });
  }, [execution.pause]);

  const handleStep = useCallback(() => {
    if (!runtime) {
      dispatch({
        type: 'ADD_LOG', payload: {
          id: Date.now().toString(),
          timestamp: Date.now(),
          message: 'No runtime available. Compile first.',
          level: 'error'
        }
      });
      return;
    }

    execution.step();
    updateSnapshot();
  }, [runtime, execution.step]);

  const handleStop = useCallback(() => {
    execution.stop();
    updateSnapshot();

    dispatch({
      type: 'ADD_LOG', payload: {
        id: Date.now().toString(),
        timestamp: Date.now(),
        message: 'Execution stopped',
        level: 'info'
      }
    });
  }, [execution.stop]);

  const handleReset = useCallback(() => {
    resetRuntime();

    dispatch({
      type: 'ADD_LOG', payload: {
        id: Date.now().toString(),
        timestamp: Date.now(),
        message: 'Runtime reset - ready for new compilation',
        level: 'info'
      }
    });
  }, [resetRuntime, dispatch]);

  useTestBenchShortcuts({
    onPlay: status === 'idle' ? handleExecute : undefined,
    onPause: status === 'running' ? handlePause : undefined,
    onStop: status === 'running' || status === 'paused' ? handleStop : undefined,
    onReset: handleReset,
    onStep: status === 'paused' ? handleStep : undefined,
    onCompile: handleCompile
  });

  return (
    <TestBenchLayout
      status={status}
      elapsedTime={elapsedTime}
      onCodeChange={handleCodeChange}
      onCompile={handleCompile}
      onExecute={handleExecute}
      onPause={handlePause}
      onStop={handleStop}
      onReset={handleReset}
      onStep={handleStep}
      className={className}
    />
  );
};

/**
 * Main Runtime Test Bench component
 * Integrates all 6 panels with state management and cross-panel interactions
 */
export const RuntimeTestBench: React.FC<RuntimeTestBenchProps> = ({
  initialCode = '',
  onCodeChange,
  className = ''
}) => {
  return (
    <TestBenchProvider initialCode={initialCode}>
      <RuntimeTestBenchInner onCodeChange={onCodeChange} className={className} />
    </TestBenchProvider>
  );
};

export default RuntimeTestBench;
