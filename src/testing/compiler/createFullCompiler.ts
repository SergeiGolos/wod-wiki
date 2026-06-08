"use strict";

/**
 * Production JIT compiler factory.
 *
 * Creates a JitCompiler with all production strategies registered
 * in the correct priority order. Used by both TestScript and
 * legacy session-test-utils.
 */
import { JitCompiler } from '@/runtime/compiler/JitCompiler';

// Logic strategies (Priority 90)
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '@/runtime/compiler/strategies/logic/IntervalLogicStrategy';

// Component strategies (Priority 50)
import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '@/runtime/compiler/strategies/components/GenericLoopStrategy';
import { GenericGroupStrategy } from '@/runtime/compiler/strategies/components/GenericGroupStrategy';
import { RestBlockStrategy } from '@/runtime/compiler/strategies/components/RestBlockStrategy';

// Enhancement strategies (Priority 15-50)
import { SoundStrategy } from '@/runtime/compiler/strategies/enhancements/SoundStrategy';
import { ReportOutputStrategy } from '@/runtime/compiler/strategies/enhancements/ReportOutputStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';

// Fallback strategies (Priority 0)
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

/**
 * Creates a JitCompiler with all production strategies registered.
 */
export function createFullCompiler(): JitCompiler {
    const compiler = new JitCompiler();

    // Logic strategies (Priority 90)
    compiler.registerStrategy(new AmrapLogicStrategy());
    compiler.registerStrategy(new IntervalLogicStrategy());

    // Component strategies (Priority 50)
    compiler.registerStrategy(new GenericTimerStrategy());
    compiler.registerStrategy(new GenericLoopStrategy());
    compiler.registerStrategy(new GenericGroupStrategy());
    compiler.registerStrategy(new RestBlockStrategy());

    // Enhancement strategies (Priority 15-50)
    compiler.registerStrategy(new SoundStrategy());
    compiler.registerStrategy(new ReportOutputStrategy());
    compiler.registerStrategy(new ChildrenStrategy());

    // Fallback strategies (Priority 0)
    compiler.registerStrategy(new EffortFallbackStrategy());

    return compiler;
}
