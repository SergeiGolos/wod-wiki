import { JitCompilerDemo } from "../compiler/JitCompilerDemo";

export default {
  title: 'Runtime/DanJon',
  component: JitCompilerDemo,
};

export const ABC = {
  args: {
    initialScript: `(20) 1:00
  + 2 Clean
  + 1 Press
  + 3 Front Squat`
  },
};

export const ABC_SigleBell = {
  args: {
    initialScript: `(20)
  + 1 Clean & Press Left
  + 1 Clean & Press Right 
  + 2 Front Squat Right
  + 1 Clean & Press Left
  + 1 Clean & Press Right 
  + 2 Front Squat Right
  :30 Rest`
  },
};
