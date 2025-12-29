import { IFragmentCompiler } from "./FragmentCompilationManager";
import { MetricValue, MetricValueType } from "../models/RuntimeMetric";
import { ActionFragment } from "../fragments/ActionFragment";
import { DistanceFragment } from "../fragments/DistanceFragment";
import { EffortFragment } from "../fragments/EffortFragment";
import { IncrementFragment } from "../fragments/IncrementFragment";
import { LapFragment } from "../fragments/LapFragment";
import { RepFragment } from "../fragments/RepFragment";
import { ResistanceFragment } from "../fragments/ResistanceFragment";
import { RoundsFragment } from "../fragments/RoundsFragment";
import { TextFragment } from "../fragments/TextFragment";
import { TimerFragment } from "../fragments/TimerFragment";
import { IScriptRuntime } from "./IScriptRuntime";

export class ActionFragmentCompiler implements IFragmentCompiler {
    readonly type = 'action';
    compile(fragment: ActionFragment, _context: IScriptRuntime): MetricValue[] {
    const label = fragment.value?.toString().trim();
    if (!label) return [];
    return [{ type: MetricValueType.Action, value: undefined, unit: `action:${label}` }];
    }
}

export class DistanceFragmentCompiler implements IFragmentCompiler {
    readonly type = 'distance';
    compile(fragment: DistanceFragment, _context: IScriptRuntime): MetricValue[] {
    const amount = typeof fragment.value.amount === 'string' ? Number(fragment.value.amount) : fragment.value.amount;
    return [{ type: MetricValueType.Distance, value: amount, unit: fragment.value.units }];
    }
}

export class EffortFragmentCompiler implements IFragmentCompiler {
    readonly type = 'effort';
    compile(fragment: EffortFragment, _context: IScriptRuntime): MetricValue[] {
    const label = fragment.value?.toString().trim();
    if (!label) return [];
    return [{ type: MetricValueType.Effort, value: undefined, unit: `effort:${label}` }];
    }
}

export class IncrementFragmentCompiler implements IFragmentCompiler {
    readonly type = 'increment';
    compile(_fragment: IncrementFragment, _context: IScriptRuntime): MetricValue[] {
        return [];
    }
}

export class LapFragmentCompiler implements IFragmentCompiler {
    readonly type = 'lap';
    compile(_fragment: LapFragment, _context: IScriptRuntime): MetricValue[] {
        return [];
    }
}

export class RepFragmentCompiler implements IFragmentCompiler {
    readonly type = 'rep';
    compile(fragment: RepFragment, _context: IScriptRuntime): MetricValue[] {
        return [{ type: MetricValueType.Repetitions, value: fragment.value, unit: '' }];
    }
}

export class ResistanceFragmentCompiler implements IFragmentCompiler {
    readonly type = 'resistance';
    compile(fragment: ResistanceFragment, _context: IScriptRuntime): MetricValue[] {
    const amount = typeof fragment.value.amount === 'string' ? Number(fragment.value.amount) : fragment.value.amount;
    return [{ type: MetricValueType.Resistance, value: amount, unit: fragment.value.units }];
    }
}

export class RoundsFragmentCompiler implements IFragmentCompiler {
    readonly type = 'rounds';
    compile(fragment: RoundsFragment, _context: IScriptRuntime): MetricValue[] {
        if (typeof fragment.value === 'string') {
            return [{ type: MetricValueType.Rounds, value: undefined, unit: fragment.value }];
        }
        return [{ type: MetricValueType.Rounds, value: fragment.value, unit: '' }];
    }
}

export class TextFragmentCompiler implements IFragmentCompiler {
    readonly type = 'text';
    compile(_fragment: TextFragment, _context: IScriptRuntime): MetricValue[] {
        return [];
    }
}

export class TimerFragmentCompiler implements IFragmentCompiler {
    readonly type = 'duration';
    compile(fragment: TimerFragment, _context: IScriptRuntime): MetricValue[] {
        return [{ type: MetricValueType.Time, value: fragment.value, unit: 'ms' }];
    }
}
