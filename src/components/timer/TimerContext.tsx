import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface TimerState {
  isRunning: boolean;
}

type TimerAction = 
  | { type: 'SET_RUNNING'; payload: boolean };

const initialState: TimerState = {
  isRunning: false
};

const timerReducer = (state: TimerState, action: TimerAction): TimerState => {
  switch (action.type) {
    case 'SET_RUNNING':
      return { ...state, isRunning: action.payload };
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
