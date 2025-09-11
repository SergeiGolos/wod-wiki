import { describe, it, expect, beforeEach } from 'vitest';
import { FragmentCompilationManager } from './FragmentCompilationManager';
import { IScriptRuntime } from './IScriptRuntime';
import { compilers, parseWodLine } from './FragmentCompilationManager.fixture';

describe('FragmentCompilationManager', () => {
    let manager: FragmentCompilationManager;
    let context: IScriptRuntime;

    beforeEach(() => {
        manager = new FragmentCompilationManager(compilers);
        context = {} as IScriptRuntime; // Mock or create a proper context as needed
    });

    it('should compile "20:00 AMRAP"', () => {
        const statements = parseWodLine('20:00 AMRAP');
        const metric = manager.compileStatementFragments(statements[0], context);
        expect(metric.effort).toBe('AMRAP');
        expect(metric.values).toEqual([{ type: 'time', value: 1200000, unit: 'ms' }]);
    });

    it('should compile "5 Pullups"', () => {
        const statements = parseWodLine('5 Pullups');
        const metric = manager.compileStatementFragments(statements[0], context);
        expect(metric.effort).toBe('Pullups');
        expect(metric.values).toEqual([{ type: 'repetitions', value: 5, unit: '' }]);
    });

    it('should compile "400m Run"', () => {
        const statements = parseWodLine('400m Run');
        const metric = manager.compileStatementFragments(statements[0], context);
        expect(metric.effort).toBe('Run');
    expect(metric.values).toEqual([{ type: 'distance', value: 400, unit: 'm' }]);
    });

    it('should compile "Thrusters 95lb"', () => {
        const statements = parseWodLine('Thrusters 95lb');
        const metric = manager.compileStatementFragments(statements[0], context);
        expect(metric.effort).toBe('Thrusters');
    expect(metric.values).toEqual([{ type: 'resistance', value: 95, unit: 'lb' }]);
    });

    it('should compile "(21-15-9) Thrusters 95lb"', () => {
        const statements = parseWodLine('(21-15-9) Thrusters 95lb');
        const metric = manager.compileStatementFragments(statements[0], context);
        expect(metric.effort).toBe('Thrusters');
        expect(metric.values).toEqual([
            { type: 'rounds', value: 3, unit: '' },
            { type: 'repetitions', value: 21, unit: '' },
            { type: 'repetitions', value: 15, unit: '' },
            { type: 'repetitions', value: 9, unit: '' },
            { type: 'resistance', value: 95, unit: 'lb' }
        ]);
    });

    it('should compile "10 Rounds 400m Run"', () => {
        const statements = parseWodLine('10 400m Run');
        const metric = manager.compileStatementFragments(statements[0], context);
        expect(metric.effort).toBe('Run');
        expect(metric.values).toEqual([
            { type: 'repetitions', value: 10, unit: '' },
            { type: 'distance', value: 400, unit: 'm' }
        ]);
    });

    it('should compile "50-40-30-20-10 Double Unders"', () => {
        const statements = parseWodLine('(50-40-30-20-10) Double Unders');
        const metric = manager.compileStatementFragments(statements[0], context);
        expect(metric.effort).toBe('Double Unders');
        expect(metric.values).toEqual([
            { type: 'rounds', value: 5, unit: '' },
            { type: 'repetitions', value: 50, unit: '' },
            { type: 'repetitions', value: 40, unit: '' },
            { type: 'repetitions', value: 30, unit: '' },
            { type: 'repetitions', value: 20, unit: '' },
            { type: 'repetitions', value: 10, unit: '' }
        ]);
    });
});