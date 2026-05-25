import { describe, it, expect } from 'bun:test';
import { inferMetricType, formatTrackerValue } from './MetricTrackerCard';

describe('inferMetricType', () => {
    it('maps exact key names to canonical types', () => {
        expect(inferMetricType('Reps')).toBe('rep');
        expect(inferMetricType('Distance')).toBe('distance');
        expect(inferMetricType('Rounds')).toBe('rounds');
        expect(inferMetricType('Action')).toBe('action');
        expect(inferMetricType('Resistance')).toBe('resistance');
        expect(inferMetricType('Duration')).toBe('duration');
        expect(inferMetricType('Elapsed')).toBe('elapsed');
        expect(inferMetricType('Total Time')).toBe('total');
        expect(inferMetricType('System Time')).toBe('system-time');
        expect(inferMetricType('Label')).toBe('label');
        expect(inferMetricType('Sound')).toBe('sound');
        expect(inferMetricType('Group')).toBe('group');
    });

    it('maps heuristic key names', () => {
        expect(inferMetricType('RIR')).toBe('rir');
        expect(inferMetricType('Session RPE')).toBe('session-rpe');
        expect(inferMetricType('Session Load')).toBe('session-load');
        expect(inferMetricType('MET Score')).toBe('met-score');
        expect(inferMetricType('TIS')).toBe('tis');
        expect(inferMetricType('Volume')).toBe('volume');
        expect(inferMetricType('Intensity')).toBe('intensity');
        expect(inferMetricType('Load')).toBe('load');
        expect(inferMetricType('Work')).toBe('work');
        expect(inferMetricType('Energy')).toBe('work');
        expect(inferMetricType('Calories')).toBe('work');
    });

    it('infers type from unit when key is ambiguous', () => {
        expect(inferMetricType('Foo', 'reps')).toBe('rep');
        expect(inferMetricType('Foo', 'km')).toBe('distance');
        expect(inferMetricType('Foo', 'lb')).toBe('resistance');
        expect(inferMetricType('Foo', 'min')).toBe('duration');
        expect(inferMetricType('Foo', 'kcal')).toBe('work');
        expect(inferMetricType('Foo', 'rounds')).toBe('rounds');
    });

    it('falls back to generic metric for unknown keys', () => {
        expect(inferMetricType('Something Weird')).toBe('metric');
        expect(inferMetricType('XYZ')).toBe('metric');
    });
});

describe('formatTrackerValue', () => {
    it('formats time-like values from milliseconds', () => {
        expect(formatTrackerValue(45000, 'duration')).toBe('00:45');
        expect(formatTrackerValue(325000, 'elapsed')).toBe('05:25');
        expect(formatTrackerValue(5461000, 'total')).toBe('01:31:01');
    });

    it('converts sec/min/h units to ms before formatting', () => {
        expect(formatTrackerValue(90, 'duration', 'sec')).toBe('01:30');
        expect(formatTrackerValue(15, 'elapsed', 'min')).toBe('15:00');
        expect(formatTrackerValue(2, 'total', 'h')).toBe('02:00:00');
    });

    it('formats integers plainly', () => {
        expect(formatTrackerValue(135, 'rep')).toBe('135');
        expect(formatTrackerValue(0, 'rep')).toBe('0');
    });

    it('formats decimals to one decimal place', () => {
        expect(formatTrackerValue(5.2, 'distance')).toBe('5.2');
        expect(formatTrackerValue(8.55, 'intensity')).toBe('8.6');
    });

    it('passes strings through unchanged', () => {
        expect(formatTrackerValue('Rest', 'effort')).toBe('Rest');
        expect(formatTrackerValue('Heavy', 'text')).toBe('Heavy');
    });

    it('handles null/undefined as em-dash', () => {
        expect(formatTrackerValue(null, 'rep')).toBe('—');
        expect(formatTrackerValue(undefined, 'rep')).toBe('—');
    });
});
