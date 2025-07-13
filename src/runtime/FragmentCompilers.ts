import { IFragmentCompiler } from "./FragmentCompilationManager";
import { MetricValue } from "./RuntimeMetric";
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
    compile(fragment: ActionFragment, context: IScriptRuntime): MetricValue[] {
        return [];
    }
}

export class DistanceFragmentCompiler implements IFragmentCompiler {
    readonly type = 'distance';
    compile(fragment: DistanceFragment, context: IScriptRuntime): MetricValue[] {
        return [{ type: 'distance', value: fragment.value.amount, unit: fragment.value.units }];
    }
}

export class EffortFragmentCompiler implements IFragmentCompiler {
    readonly type = 'effort';
    compile(fragment: EffortFragment, context: IScriptRuntime): MetricValue[] {
        return [];
    }
}

export class IncrementFragmentCompiler implements IFragmentCompiler {
    readonly type = 'increment';
    compile(fragment: IncrementFragment, context: IScriptRuntime): MetricValue[] {
        return [];
    }
}

export class LapFragmentCompiler implements IFragmentCompiler {
    readonly type = 'lap';
    compile(fragment: LapFragment, context: IScriptRuntime): MetricValue[] {
        return [];
    }
}

export class RepFragmentCompiler implements IFragmentCompiler {
    readonly type = 'rep';
    compile(fragment: RepFragment, context: IScriptRuntime): MetricValue[] {
        return [{ type: 'repetitions', value: fragment.value, unit: '' }];
    }
}

export class ResistanceFragmentCompiler implements IFragmentCompiler {
    readonly type = 'resistance';
    compile(fragment: ResistanceFragment, context: IScriptRuntime): MetricValue[] {
        return [{ type: 'resistance', value: fragment.value.amount, unit: fragment.value.units }];
    }
}

export class RoundsFragmentCompiler implements IFragmentCompiler {
    readonly type = 'rounds';
    compile(fragment: RoundsFragment, context: IScriptRuntime): MetricValue[] {
        return [{ type: 'rounds', value: fragment.value, unit: '' }];
    }
}

export class TextFragmentCompiler implements IFragmentCompiler {
    readonly type = 'text';
    compile(fragment: TextFragment, context: IScriptRuntime): MetricValue[] {
        return [];
    }
}

export class TimerFragmentCompiler implements IFragmentCompiler {
    readonly type = 'duration';
    compile(fragment: TimerFragment, context: IScriptRuntime): MetricValue[] {
        return [{ type: 'time', value: fragment.value, unit: 'ms' }];
    }
}
