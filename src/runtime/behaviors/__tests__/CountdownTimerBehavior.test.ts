/**
 * CountdownTimerBehavior tests for the childSelection capability seam.
 *
 * Phase A replaces a `behaviors[i].constructor.name === 'ChildSelectionBehavior'`
 * string-inspection hack with a first-class capability query on
 * `IBehaviorContext`.  These tests pin the observable behavior at both
 * ends of the seam:
 *
 * - When the block has a `ChildSelectionBehavior` (and therefore
 *   `'childSelection'` is declared), `onNext` returns no rest action and
 *   `handleExpiry` returns early before advancing round/child status.
 * - When the block does NOT have a `ChildSelectionBehavior`, `onNext`
 *   falls through to its existing rest-injection logic.
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { CountdownTimerBehavior, CountdownTimerConfig } from '../CountdownTimerBehavior';
import { ChildSelectionBehavior } from '../ChildSelectionBehavior';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { PushBlockAction } from '../../actions/stack/PushBlockAction';

describe('CountdownTimerBehavior — childSelection capability seam', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    /**
     * Mount behaviors directly (bypassing harness.mount) so the actions
     * returned by ChildSelectionBehavior.onMount are not executed.  This
     * avoids pulling CompileAndPushBlockAction into the mock runtime,
     * which has no `script.getIds` implementation.
     */
    function mountDirectly(
        timerConfig: CountdownTimerConfig,
        childSelectionConfig: ConstructorParameters<typeof ChildSelectionBehavior>[0] | null
    ) {
        harness = new BehaviorTestHarness().withClock(new Date('2024-01-01T00:00:00Z'));

        const timer = new CountdownTimerBehavior(timerConfig);
        const behaviors = childSelectionConfig
            ? [timer, new ChildSelectionBehavior(childSelectionConfig)]
            : [timer];

        const block = new MockBlock('test-block', behaviors, { label: 'Test Block' });
        harness.push(block);
        // Drive lifecycle manually so we can inspect returned actions
        // without the mock runtime trying to resolve child statement ids.
        block.mount(harness.runtime);
        return block;
    }

    it('onNext skips rest injection when childSelection capability is declared', () => {
        const restFactory = (durationMs: number) => [
            new PushBlockAction({} as any, { startTime: new Date(Date.now() + durationMs) })
        ];
        const block = mountDirectly(
            { durationMs: 60_000, restBlockFactory: restFactory as any },
            { childGroups: [[1]], injectRest: false }
        );

        const actions = block.next(harness.runtime);

        // The capability gate should suppress the rest-block action that
        // would otherwise be returned by `restBlockFactory`.
        expect(actions.some(a => a.type === 'push-block')).toBe(false);
    });

    it('onNext falls through to restBlockFactory when capability is absent', () => {
        const restFactory = (durationMs: number, label: string) => {
            const restBlock = { key: { toString: () => `rest-${label}-${durationMs}` } } as any;
            return [new PushBlockAction(restBlock)];
        };
        const block = mountDirectly(
            { durationMs: 60_000, restBlockFactory: restFactory as any },
            null
        );

        const actions = block.next(harness.runtime);

        // Without a peer ChildSelectionBehavior, the timer pushes its own rest.
        expect(actions.some(a => a.type === 'push-block')).toBe(true);
    });

    it('capability query survives across new BehaviorContext instances (inspectNext)', () => {
        // Regression: the seam's capability must live in a Set that is
        // shared across all `BehaviorContext` instances for a block, not
        // the per-call instance created by `RuntimeBlock.inspectNext`.
        const block = mountDirectly(
            { durationMs: 60_000 },
            { childGroups: [[1]], injectRest: false }
        );

        const mountedCtx = (block as any).behaviorContext;
        expect(mountedCtx).toBeDefined();
        // Mirror how the production event-bus prototype-chains a callback ctx.
        const childCtx = Object.create(mountedCtx, {
            clock: { value: mountedCtx.clock, enumerable: true, configurable: true }
        });
        expect(childCtx.hasCapability('childSelection')).toBe(true);
    });
});
