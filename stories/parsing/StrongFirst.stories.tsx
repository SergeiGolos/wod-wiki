import { Parser } from './Parser';

export default {
  title: 'Parser/StrongFirst',
  component: Parser,
};

export const SimpleAndSinister = {
  args: {
    text: `5:00 100 KB Swings 70lb
1:00 Rest
10:00 10 Turkish Getups 70lb`
  },
};

export const KBAxeHeavy = {
  args: {
    text: `(20) 1:00 
  4 KB Swings 106lb`
  },
};

export const KBAxeLite = {
  args: {
    text: `(20) 1:00 
  6 KB Swings 70lb`
  },
};
