/**
 * Minimal executable runtime action shape.
 *
 * Describes what {@link IRuntimeActionable.do}/{@link IRuntimeActionable.doAll}
 * actually require — an object with a string `type` discriminator AND a
 * `do()` method that the executor can invoke. Typing the queue surface
 * through this primitive ensures callers cannot enqueue a non-executable
 * object that would crash the action loop.
 *
 * `IRuntimeAction` extends this primitive (adding the optional `target`
 * and `payload` fields, plus a richer return type for chained child
 * actions).
 *
 * Lives in the same file as {@link IRuntimeActionable} (rather than its
 * own module) so neither primitive needs to import the other — that would
 * create an internal cycle inside the primitives layer itself.
 */
export interface IRuntimeActionLike {
    /** Type discriminator for the action. */
    readonly type: string;

    /**
     * Execute the action against the runtime context. Implementations may
     * return additional actions (see `IRuntimeAction.do`) — the primitive
     * shape only requires that the method exists.
     */
    do(runtime: IRuntimeActionable): unknown;
}

/**
 * Minimal primitive abstraction representing the runtime context that can
 * queue runtime actions.
 *
 * Both {@link IScriptRuntime} and {@link IEventBus} depend on this primitive
 * (or a stronger primitive that extends it) instead of each other. This
 * breaks the cycles between `IRuntimeAction ↔ IScriptRuntime` and
 * `IEventBus ↔ IScriptRuntime`.
 *
 * Actions are typed structurally through {@link IRuntimeActionLike} — an
 * executable shape requiring both a `type` discriminator and a `do()`
 * method. This keeps the primitives layer free of back-references into the
 * broader contracts (it does NOT import `IRuntimeAction`) while still
 * forcing queued actions to be executable so the action loop cannot crash
 * on a structurally-typed but inert object.
 *
 * Concretely the runtime is always an `IScriptRuntime`, but typing through
 * this primitive prevents the contract-layer cycle.
 */
export interface IRuntimeActionable {
    /**
     * Execute a single action at the next available opportunity.
     */
    do(action: IRuntimeActionLike): void;

    /**
     * Execute multiple actions in order, internalizing reverse-push for LIFO
     * processing. The first action in the array will execute first.
     */
    doAll(actions: IRuntimeActionLike[]): void;
}
