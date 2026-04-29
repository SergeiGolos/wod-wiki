/**
 * Minimal primitive abstraction representing the runtime context that can
 * queue runtime actions.
 *
 * Both {@link IScriptRuntime} and {@link IEventBus} depend on this primitive
 * instead of each other. This breaks the cycle between
 * `IRuntimeAction ↔ IScriptRuntime` and `IEventBus ↔ IScriptRuntime`.
 *
 * The action parameter is typed structurally (`{ readonly type: string }`)
 * so this primitive does NOT need to import `IRuntimeAction` — keeping
 * the primitives layer free of back-references into the broader contracts.
 *
 * Concretely the runtime is always an `IScriptRuntime`, but typing through
 * this primitive prevents the contract-layer cycle.
 */
export interface IRuntimeActionable {
    /**
     * Execute a single action at the next available opportunity.
     */
    do(action: { readonly type: string }): void;

    /**
     * Execute multiple actions in order, internalizing reverse-push for LIFO
     * processing. The first action in the array will execute first.
     */
    doAll(actions: { readonly type: string }[]): void;
}
