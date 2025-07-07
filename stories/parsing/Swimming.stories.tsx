import { Parser } from './Parser';
import * as swimming from '../workouts/swimming';

export default {
  title: 'Parser/Swimming',
  component: Parser,
};

export const BeginnerFriendlySwimming = { args: { text: swimming.BeginnerFriendlySwimming } };
export const IntermediateSwimming = { args: { text: swimming.IntermediateSwimming } };
export const AdvancedSwimming = { args: { text: swimming.AdvancedSwimming } };
export const LongDistanceSwimming = { args: { text: swimming.LongDistanceSwimming } };
export const SprintSwimming = { args: { text: swimming.SprintSwimming } };
export const IndividualMedleySwimming = { args: { text: swimming.IndividualMedleySwimming } };
