import { RuntimeFixture } from "./RuntimeFixture";

export default {
  title: 'Runtime/DanJon',
  component: RuntimeFixture,
};

export const ABC = {
  args: {
    text: `(20) 1:00
  + 2 Clean
  + 1 Press
  + 3 Front Squat`
  },
};

export const ABC_SigleBell = {
  args: {
    text: `(20)
  + 1 Clean + Press Left
  + 1 Clean + Press Right 
  + 2 Front Squat Right
  + 1 Clean + Press Left
  + 1 Clean + Press Right 
  + 2 Front Squat Right
  :30 Rest`
  },
};
