import { JitCompilerDemo } from "../compiler/JitCompilerDemo";

export default {
  title: 'Runtime/StrongFirst',
  component: JitCompilerDemo,
};

export const SimpleAndSinister = {
  args: {
    initialScript: `5:00 100 KB Swings 70lb
1:00 Rest
10:00 10 Turkish Getups 70lb`
  },
};

export const KBAxeHeavy = {
  args: {
    initialScript: `(20) 1:00 
  4 KB Swings 106lb`
  },
};

export const KBAxeLite = {
  args: {
    initialScript: `(20) 1:00 
  6 KB Swings 70lb`
  },
};
