import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { RuntimeTestBenchState, ParseResults, ExecutionSnapshot } from '../types/interfaces';

export interface TestBenchContextState {
  code: string;
  parseResults: ParseResults;
  snapshot: ExecutionSnapshot | null;
  compilationLog: any[];
  selectedLine: number | null;
}

type TestBenchAction =
  | { type: 'SET_CODE'; payload: string }
  | { type: 'SET_PARSE_RESULTS'; payload: ParseResults }
  | { type: 'SET_SNAPSHOT'; payload: ExecutionSnapshot | null }
  | { type: 'ADD_LOG'; payload: any }
  | { type: 'CLEAR_LOG' }
  | { type: 'SET_SELECTED_LINE'; payload: number | null }
  | { type: 'RESET' };

const initialState: TestBenchContextState = {
  code: '',
  parseResults: {
    statements: [],
    errors: [],
    warnings: [],
    status: 'idle'
  },
  snapshot: null,
  compilationLog: [],
  selectedLine: null
};

const testBenchReducer = (state: TestBenchContextState, action: TestBenchAction): TestBenchContextState => {
  switch (action.type) {
    case 'SET_CODE':
      return { ...state, code: action.payload };
    case 'SET_PARSE_RESULTS':
      return { ...state, parseResults: action.payload };
    case 'SET_SNAPSHOT':
      return { ...state, snapshot: action.payload };
    case 'ADD_LOG':
      return { ...state, compilationLog: [...state.compilationLog, action.payload] };
    case 'CLEAR_LOG':
      return { ...state, compilationLog: [] };
    case 'SET_SELECTED_LINE':
      return { ...state, selectedLine: action.payload };
    case 'RESET':
      return { ...initialState, code: state.code }; // Preserve code on reset
    default:
      return state;
  }
};

const TestBenchContext = createContext<{
  state: TestBenchContextState;
  dispatch: React.Dispatch<TestBenchAction>;
} | undefined>(undefined);

export const TestBenchProvider: React.FC<{ children: ReactNode; initialCode?: string }> = ({
  children,
  initialCode = ''
}) => {
  const [state, dispatch] = useReducer(testBenchReducer, { ...initialState, code: initialCode });

  return (
    <TestBenchContext.Provider value={{ state, dispatch }}>
      {children}
    </TestBenchContext.Provider>
  );
};

export const useTestBenchContext = () => {
  const context = useContext(TestBenchContext);
  if (!context) {
    throw new Error('useTestBenchContext must be used within a TestBenchProvider');
  }
  return context;
};
