import { Parser } from './Parser';
import * as danJon from '../workouts/dan-jon';

export default {
  title: 'Parser/DanJon',
  component: Parser,
};

export const ABC = { args: { text: danJon.ABC } };
export const ABC_SigleBell = { args: { text: danJon.ABC_SigleBell } };

