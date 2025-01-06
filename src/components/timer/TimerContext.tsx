import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { RuntimeBlock } from '../../lib/RuntimeBlock';
import { Timestamp } from '../../lib/Timestamp';

interface TimerState {
  elapsedTime: [string, string];
  isRunning: boolean;
  block?: RuntimeBlock;
  timestamps: Timestamp[];
  currentTime: Date;
}

type TimerAction = 
  | { type: 'SET_ELAPSED_TIME'; payload: [string, string] }
  | { type: 'SET_RUNNING'; payload: boolean }
  | { type: 'SET_BLOCK'; payload: RuntimeBlock | undefined }
  | { type: 'SET_TIMESTAMPS'; payload: Timestamp[] }
  | { type: 'UPDATE_TIME'; payload: Date };

const initialState: TimerState = {
  elapsedTime: ['0', '00'],
  isRunning: false,
  timestamps: [],
  currentTime: new Date()
};

const timerReducer = (state: TimerState, action: TimerAction): TimerState => {
  switch (action.type) {
    case 'SET_ELAPSED_TIME':
      return { ...state, elapsedTime: action.payload };
    case 'SET_RUNNING':
      return { ...state, isRunning: action.payload };
    case 'SET_BLOCK':
      return { ...state, block: action.payload };
    case 'SET_TIMESTAMPS':
      return { ...state, timestamps: action.payload };
    case 'UPDATE_TIME':
      return { ...state, currentTime: action.payload };
    default:
      return state;
  }
};

interface TimerContextType {
  state: TimerState;
  dispatch: React.Dispatch<TimerAction>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(timerReducer, initialState);

  return (
    <TimerContext.Provider value={{ state, dispatch }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};
