import { JitCompilerDemo } from './JitCompilerDemo';

export default {
  title: 'Runtime/JitCompiler',
  component: JitCompilerDemo,
};

export const BasicCompilation = {
  args: {
    text: `(21-15-9) 
  Thrusters 95lb
  Pullups`
  },
};

export const TimerCompilation = {
  args: {
    text: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`
  },
};

export const ComplexWorkout = {
  args: {
    text: `(5)
  + 20 Pullups
  + 30 Pushups
  + 40 Situps
  + 50 Air Squats
  3:00 Rest`
  },
};

export const EMOMWorkout = {
  args: {
    text: `(30) :60 EMOM
  + 5 Pullups
  + 10 Pushups
  + 15 Air Squats`
  },
};
