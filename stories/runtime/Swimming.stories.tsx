import { JitCompilerDemo } from "../compiler/JitCompilerDemo";

export default {
  title: 'Runtime/Swimming',
  component: JitCompilerDemo,
};

export const BeginnerFriendlySwimming = {
  args: {
    initialScript: `(6) Warmup
  25m Swim
  :20 Rest

100m Kick

(6) Warmup
  25m Swim
  :20 Rest

100m Kick

(6) Warmup
  25m Swim
  :20 Rest
  
100m Cooldown`
  },
};
