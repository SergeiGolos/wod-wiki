import { IFragmentCompiler, IFragmentCompilationContext } from "./FragmentCompilationManager";
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

export class ActionFragmentCompiler implements IFragmentCompiler {
    readonly type = 'action';
    compile(fragment: ActionFragment, context: IFragmentCompilationContext): MetricValue[] {
        return [];
    }
}

export class DistanceFragmentCompiler implements IFragmentCompiler {
    readonly type = 'distance';
    compile(fragment: DistanceFragment, context: IFragmentCompilationContext): MetricValue[] {
        return [{ type: 'distance', value: fragment.value.amount, unit: fragment.value.units }];
    }
}

export class EffortFragmentCompiler implements IFragmentCompiler {
    readonly type = 'effort';
    compile(fragment: EffortFragment, context: IFragmentCompilationContext): MetricValue[] {
        return [];
    }
}

export class IncrementFragmentCompiler implements IFragmentCompiler {
    readonly type = 'increment';
    compile(fragment: IncrementFragment, context: IFragmentCompilationContext): MetricValue[] {
        return [];
    }
}

export class LapFragmentCompiler implements IFragmentCompiler {
    readonly type = 'lap';
    compile(fragment: LapFragment, context: IFragmentCompilationContext): MetricValue[] {
        return [];
    }
}

export class RepFragmentCompiler implements IFragmentCompiler {
    readonly type = 'rep';
    compile(fragment: RepFragment, context: IFragmentCompilationContext): MetricValue[] {
        return [{ type: 'repetitions', value: fragment.value, unit: '' }];
    }
}

export class ResistanceFragmentCompiler implements IFragmentCompiler {
    readonly type = 'resistance';
    compile(fragment: ResistanceFragment, context: IFragmentCompilationContext): MetricValue[] {
        return [{ type: 'resistance', value: fragment.value.amount, unit: fragment.value.units }];
    }
}

export class RoundsFragmentCompiler implements IFragmentCompiler {
    readonly type = 'rounds';
    compile(fragment: RoundsFragment, context: IFragmentCompilationContext): MetricValue[] {
        return [{ type: 'rounds', value: fragment.value, unit: '' }];
    }
}

export class TextFragmentCompiler implements IFragmentCompiler {
    readonly type = 'text';
    compile(fragment: TextFragment, context: IFragmentCompilationContext): MetricValue[] {
        return [];
    }
}

export class TimerFragmentCompiler implements IFragmentCompiler {
    readonly type = 'duration';
    compile(fragment: TimerFragment, context: IFragmentCompilationContext): MetricValue[] {
        return [{ type: 'time', value: fragment.value, unit: 'ms' }];
    }
}
