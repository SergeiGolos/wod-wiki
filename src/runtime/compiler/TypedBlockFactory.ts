import { ICodeStatement } from '@/core/models/CodeStatement';
import { ICodeFragment, FragmentType } from '@/core/models/CodeFragment';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { EmomBlock } from '../typed-blocks/EmomBlock';
import { AmrapBlock } from '../typed-blocks/AmrapBlock';
import { TimerLeafBlock } from '../typed-blocks/TimerLeafBlock';
import { RoundLoopBlock } from '../typed-blocks/RoundLoopBlock';
import { SequentialContainerBlock } from '../typed-blocks/SequentialContainerBlock';
import { EffortLeafBlock } from '../typed-blocks/EffortLeafBlock';

/**
 * TypedBlockFactory creates concrete typed blocks from code statements.
 *
 * Replaces the strategy composition pipeline (BlockBuilder + multiple strategies)
 * with direct construction of typed blocks. Detection logic mirrors the old
 * strategy match() conditions but in priority order:
 *
 *   1. EMOM  (Duration + interval hint / emom keyword)
 *   2. AMRAP (Duration + Rounds / amrap keyword)
 *   3. Timer Leaf (Duration, no children)
 *   4. Timer Container (Duration + children) → treated as AMRAP (countdown controls loop)
 *   5. Round Loop (Rounds + children)
 *   6. Group (children, no Duration, no Rounds)
 *   7. Effort Fallback (no Duration, no Rounds, no children)
 */
export class TypedBlockFactory {

    create(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
        if (!statements || statements.length === 0) return undefined;

        const analysis = this.analyzeStatements(statements);

        // Priority 90: EMOM — Duration + interval hint or "emom" keyword
        if (analysis.hasDuration && analysis.isEmom) {
            return this.createEmomBlock(statements, runtime, analysis);
        }

        // Priority 90: AMRAP — Duration + Rounds or "amrap"/"rounds" keyword
        if (analysis.hasDuration && analysis.isAmrap) {
            return this.createAmrapBlock(statements, runtime, analysis);
        }

        // Priority 50: Timer with children → AMRAP-like (countdown controls unbounded loop)
        if (analysis.hasDuration && analysis.hasChildren) {
            return this.createAmrapBlock(statements, runtime, analysis);
        }

        // Priority 50: Timer Leaf — Duration, no children
        if (analysis.hasDuration && !analysis.hasChildren) {
            return this.createTimerLeafBlock(statements, runtime, analysis);
        }

        // Priority 50: Round Loop — Rounds (with or without children)
        if (analysis.hasRounds) {
            return this.createRoundLoopBlock(statements, runtime, analysis);
        }

        // Priority 50: Group — children, no Duration, no Rounds
        if (analysis.hasChildren) {
            return this.createGroupBlock(statements, runtime, analysis);
        }

        // Priority 0: Effort Fallback — everything else
        return this.createEffortBlock(statements, runtime, analysis);
    }

    // ====================================================================
    // Statement Analysis
    // ====================================================================

    private analyzeStatements(statements: ICodeStatement[]): StatementAnalysis {
        const hasDuration = statements.some(s =>
            s.fragments.some(f => f.fragmentType === FragmentType.Duration && f.origin !== 'runtime')
        );

        const hasRounds = statements.some(s =>
            s.fragments.some(f => f.fragmentType === FragmentType.Rounds && f.origin !== 'runtime')
        );

        const hasChildren = statements.some(s =>
            s.children && s.children.length > 0
        );

        // EMOM detection: interval hint or "emom" keyword
        const isEmom = hasDuration && (
            statements.some(s => s.hints?.has('behavior.repeating_interval') ?? false) ||
            statements.some(s => s.fragments.some(
                f => (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort)
                    && typeof f.value === 'string'
                    && f.value.toLowerCase() === 'emom'
            ))
        );

        // AMRAP detection: Rounds fragment or "amrap"/"rounds" keyword
        const isAmrap = hasDuration && (
            hasRounds ||
            statements.some(s => s.fragments.some(
                f => (f.fragmentType === FragmentType.Effort || f.fragmentType === FragmentType.Action)
                    && typeof f.value === 'string'
                    && (f.value.toLowerCase() === 'rounds' || f.value.toLowerCase() === 'amrap')
            ))
        );

        // Extract fragments
        const durationFragment = this.findFragment(statements, FragmentType.Duration, true);
        const roundsFragment = this.findFragment(statements, FragmentType.Rounds, true);
        const effortFragment = this.findFragment(statements, FragmentType.Effort);
        const labelFragment = this.findFragment(statements, FragmentType.Label);

        const durationMs = durationFragment ? Number(durationFragment.value) || 0 : 0;
        const totalRounds = roundsFragment ? Number(roundsFragment.value) || 1 : 1;

        // Build label from fragments
        const label = this.buildLabel(statements, {
            effortFragment, labelFragment, durationMs, totalRounds
        });

        // Collect plan fragments (non-runtime)
        const planFragments = statements.flatMap(s =>
            s.fragments.filter(f => f.origin !== 'runtime')
        );

        // Child groups
        const childGroups = hasChildren
            ? (statements[0].children ?? []).filter(g => g.length > 0)
            : [];

        return {
            hasDuration, hasRounds, hasChildren,
            isEmom, isAmrap,
            durationMs, totalRounds,
            label, planFragments, childGroups,
            sourceIds: statements.map(s => s.id),
        };
    }

    private findFragment(
        statements: ICodeStatement[],
        type: FragmentType,
        excludeRuntime = false
    ): ICodeFragment | undefined {
        for (const s of statements) {
            const f = s.fragments.find(f =>
                f.fragmentType === type && (!excludeRuntime || f.origin !== 'runtime')
            );
            if (f) return f;
        }
        return undefined;
    }

    private buildLabel(
        statements: ICodeStatement[],
        ctx: { effortFragment?: ICodeFragment; labelFragment?: ICodeFragment; durationMs: number; totalRounds: number }
    ): string {
        if (ctx.labelFragment?.image) return ctx.labelFragment.image;
        if (ctx.effortFragment?.image) return ctx.effortFragment.image;

        // Fallback: build from content fragments
        const contentParts = statements.flatMap(s =>
            s.fragments
                .filter(f => f.fragmentType === FragmentType.Effort || f.fragmentType === FragmentType.Text)
                .map(f => f.image)
                .filter((img): img is string => !!img)
        );
        if (contentParts.length > 0) return contentParts.join(' ');

        return 'Block';
    }

    // ====================================================================
    // Block Creators
    // ====================================================================

    private createEmomBlock(
        _statements: ICodeStatement[],
        runtime: IScriptRuntime,
        a: StatementAnalysis
    ): IRuntimeBlock {
        return new EmomBlock(runtime, {
            intervalMs: a.durationMs,
            totalRounds: a.totalRounds,
            label: a.label,
            sourceIds: a.sourceIds,
            childGroups: a.childGroups,
            planFragments: a.planFragments,
        });
    }

    private createAmrapBlock(
        _statements: ICodeStatement[],
        runtime: IScriptRuntime,
        a: StatementAnalysis
    ): IRuntimeBlock {
        return new AmrapBlock(runtime, {
            durationMs: a.durationMs,
            label: a.label,
            sourceIds: a.sourceIds,
            childGroups: a.childGroups,
            planFragments: a.planFragments,
        });
    }

    private createTimerLeafBlock(
        _statements: ICodeStatement[],
        runtime: IScriptRuntime,
        a: StatementAnalysis
    ): IRuntimeBlock {
        return new TimerLeafBlock(runtime, {
            durationMs: a.durationMs,
            label: a.label,
            sourceIds: a.sourceIds,
            planFragments: a.planFragments,
            allowSkip: true, // Timer leaves are skippable by default in JIT
        });
    }

    private createRoundLoopBlock(
        _statements: ICodeStatement[],
        runtime: IScriptRuntime,
        a: StatementAnalysis
    ): IRuntimeBlock {
        return new RoundLoopBlock(runtime, {
            totalRounds: a.totalRounds,
            label: a.label,
            sourceIds: a.sourceIds,
            childGroups: a.childGroups,
            planFragments: a.planFragments,
        });
    }

    private createGroupBlock(
        _statements: ICodeStatement[],
        runtime: IScriptRuntime,
        a: StatementAnalysis
    ): IRuntimeBlock {
        return new SequentialContainerBlock(runtime, {
            label: a.label,
            sourceIds: a.sourceIds,
            childGroups: a.childGroups,
            planFragments: a.planFragments,
        });
    }

    private createEffortBlock(
        _statements: ICodeStatement[],
        runtime: IScriptRuntime,
        a: StatementAnalysis
    ): IRuntimeBlock {
        const effortName = a.label || 'Effort';
        const targetReps = a.totalRounds; // Rounds fragment used as rep target for non-container

        return new EffortLeafBlock(runtime, {
            exerciseName: effortName,
            targetReps: targetReps > 0 ? targetReps : 1,
            sourceIds: a.sourceIds,
            planFragments: a.planFragments,
        });
    }
}

interface StatementAnalysis {
    hasDuration: boolean;
    hasRounds: boolean;
    hasChildren: boolean;
    isEmom: boolean;
    isAmrap: boolean;
    durationMs: number;
    totalRounds: number;
    label: string;
    planFragments: ICodeFragment[];
    childGroups: number[][];
    sourceIds: number[];
}
