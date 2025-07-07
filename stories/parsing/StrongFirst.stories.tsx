import { Parser } from './Parser';
import * as strongFirst from '../workouts/strongfirst';

export default {
  title: 'Parser/StrongFirst',
  component: Parser,
};

export const SimpleAndSinister = { args: { text: strongFirst.SimpleAndSinister } };
export const KBAxeHeavy = { args: { text: strongFirst.KBAxeHeavy } };
export const KBAxeLite = { args: { text: strongFirst.KBAxeLite } };
