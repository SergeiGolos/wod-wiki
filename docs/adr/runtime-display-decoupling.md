# ADR: Runtime-to-Display Decoupling

**Status:** Draft  
**Date:** 2026-06-10  
**Authors:** GUPPI (architecture review)

---

## Context

The wod-wiki codebase currently has a hard 1:1 coupling between `ScriptRuntime` lifecycle and the React component tree. This manifests as:

1. **One runtime per provider subtree** — `RuntimeLifecycleProvider` creates exactly one `ScriptRuntime` and exposes it via React context. There is no mechanism to have two runtimes active simultaneously, or to rebind a display to a different runtime without unmounting the entire subtree.

2. **Display components couple to runtime internals** — 30+ display components (`TimerDisplay`, `VisualStatePanel`, `RuntimeStackView`, etc.) call runtime-specific hooks (`useStackTimers`, `usePrimaryTimer`, `useOutputStatements`, `useSnapshotBlocks`) that reach into `IScriptRuntime` internals. A Chromecast receiver has to create a `ChromecastProxyRuntime` (a 580-line fake `IScriptRuntime`) just to make those hooks work.

3. **The cast bridge reads Zustand, not runtime state** — `WorkbenchCastBridge` reads from `workbenchSyncStore` (view mode, selected block, analytics segments) and pushes to a Chromecast receiver. This is a one-off broadcaster with no abstraction for other target types.

4. **Two runtime creation paths with divergent wiring** — `RuntimeLifecycleProvider` (workbench path) wires tracker, analytics engine, and subscription manager. `createRuntimeForBlock()` in `runtimeTimerModel.ts` (standalone panel path) calls the same factory but omits all of it.

The user wants: full-screen targets, canvas window targets (like code editor windows), remote targets (Chromecast), and the ability to have **multiple runtimes and multiple targets**, rebinding any target to any runtime on the fly.

---

## Current Architecture

### Runtime Creation Paths

| Path | File | Wires Tracker | Wires Analytics | SubscriptionManager |
|------|------|:--------------:|:---------------:|:------------------:|
| Workbench | `RuntimeLifecycleProvider.tsx` | ✓ | ✓ | ✓ |
| Standalone panel | `runtimeTimerModel.ts` | ✗ | ✗ | ✗ |
| Chromecast receiver | `receiver-rpc.tsx` | ✗ | ✗ | ✗ |

### Provider Hierarchy

```
CommandProvider
  WorkbenchProvider
    RuntimeLifecycleProvider        ← owns ScriptRuntime lifecycle
      SubscriptionManagerContext   ← nested inside
      WorkbenchCastBridge          ← reads Zustand, pushes to Chromecast
      WorkbenchContent            ← renders display panels
    ...
```

### Display Components — Access Patterns

| Pattern | Count | Example |
|---------|-------|---------|
| `useScriptRuntime()` context | 9 | `TimerDisplay`, `VisualStatePanel`, `StackBlockItem` |
| Props `runtime: IScriptRuntime` | 8 | `RuntimeStackView`, `RuntimeDebugPanel`, `ReviewGrid` |
| Owns runtime lifecycle | 3 | `RuntimeTimerPanel`, `TimerHarness`, `ReceiverApp` |
| Reads workbench store | 4 | `WorkbenchCastBridge`, `EditorCastBridge`, `TimerDisplay` (status) |
| Props pre-computed from RPC | 3 | `ReceiverPreviewPanel`, `ReceiverReviewPanel` |

---

## Candidates

### Candidate 1: RuntimeBinding — Indirection Between Lifecycle and Display

**Files:** `src/contexts/RuntimeLifecycleProvider.tsx`, `src/runtime/context/RuntimeContext.tsx`

#### Problem

`RuntimeLifecycleProvider` creates a `ScriptRuntime` and exposes it via `RuntimeLifecycleContext`. The display subtree consumes it via `useScriptRuntime()` which reads from `ScriptRuntimeContext`. There is no seam between "which runtime exists" and "which runtime this display is bound to."

#### Before

```tsx
// RuntimeLifecycleProvider.tsx — creates ONE runtime, binds it to ONE subtree
export const RuntimeLifecycleProvider: React.FC<RuntimeLifecycleProviderProps> = ({
  factory, children
}) => {
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);
  // ...
  const initializeRuntime = useCallback((block: ScriptBlock) => {
    const newRuntime = factoryRef.current.createRuntime(block, { tracker });
    currentRuntimeRef.current = newRuntime;
    setRuntime(newRuntime);
  }, []);
  // ...
  return (
    <RuntimeLifecycleContext.Provider value={{ runtime, initializeRuntime, ... }}>
      {children}
    </RuntimeLifecycleContext.Provider>
  );
};
```

```tsx
// Any display component — hard-bound to whatever runtime LifecycleProvider created
const TimerDisplay: React.FC<TimerDisplayProps> = ({ elapsedMs, ... }) => {
  const runtime = useScriptRuntime();       // reads from ScriptRuntimeContext
  const timers = useStackTimers(runtime);  // hooks couple to IScriptRuntime
  const blocks = useSnapshotBlocks(runtime);
  // ...
};
```

#### After

```tsx
// RuntimeBinding — a thin context that holds a runtime reference
// The binding can be swapped without remounting the display subtree
interface RuntimeBinding {
  runtime: IScriptRuntime | null;
  // Optional: which runtime "slot" this binding points to
  slot?: string;
}

const RuntimeBindingContext = createContext<RuntimeBinding>({ runtime: null });

// RuntimeBindingProvider — sits below RuntimeLifecycleProvider
const RuntimeBindingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [binding, setBinding] = useState<RuntimeBinding>({ runtime: null });

  const bind = useCallback((runtime: IScriptRuntime, slot?: string) => {
    setBinding({ runtime, slot });
  }, []);

  const unbind = useCallback(() => {
    setBinding({ runtime: null });
  }, []);

  return (
    <RuntimeBindingContext.Provider value={binding}>
      {children}
    </RuntimeBindingContext.Provider>
  );
};
```

```tsx
// Display component — reads from binding, not from lifecycle context directly
const TimerDisplay: React.FC<TimerDisplayProps> = ({ elapsedMs, ... }) => {
  const { runtime } = useContext(RuntimeBindingContext);  // rebindable
  // The same hooks still work — they call useScriptRuntime() internally,
  // but now useScriptRuntime() reads from the binding, not the lifecycle
  const timers = useStackTimers();
  const blocks = useSnapshotBlocks();
  // ...
};

// Rebind a display to a different runtime on the fly — no unmount needed
function rebindDisplay(targetId: string, newRuntime: IScriptRuntime) {
  const binding = displayBindings.get(targetId);
  binding?.setBinding({ runtime: newRuntime });  // one state update
}
```

#### Benefits

- **Locality**: The decision "which runtime does this display show?" lives in the binding context, not scattered across 30+ components.
- **Multiple targets**: Each display target has its own binding. Two displays can show the same runtime, or different runtimes.
- **Rebinding**: Swap a target's binding to a different runtime without unmounting. Useful for "preview on a second window" without losing the primary workout state.
- **Testability**: Tests can create two runtimes, bind displays to each, and swap bindings — impossible today.

---

### Candidate 2: Display-Role Interfaces — What Each Display Type Actually Needs

**Files:** `src/runtime/hooks/useStackDisplay.ts`, `src/runtime/hooks/useStackSnapshot.ts`, display components

#### Problem

Display components call runtime-internal hooks (`useSnapshotBlocks`, `useStackTimers`, `useOutputStatements`, `usePrimaryTimer`, `useActiveControls`) that reach into `IScriptRuntime` internals. These hooks are tightly coupled to the concrete runtime implementation — they subscribe to `runtime.stack.subscribe()`, read `runtime.eventBus`, and call `runtime.subscribeToOutput()`.

The Chromecast receiver already hit this wall: `ChromecastProxyRuntime` is a 580-line shim that re-implements `IScriptRuntime` backed by RPC, just so the existing hooks work.

#### Before

```tsx
// useStackSnapshot.ts — directly calls useScriptRuntime(), reaches into IScriptRuntime internals
export function useSnapshotBlocks(): readonly IRuntimeBlock[] {
  const runtime = useScriptRuntime();  // ← couples to IScriptRuntime
  const [blocks, setBlocks] = useState<readonly IRuntimeBlock[]>([]);

  useEffect(() => {
    const unsubscribe = runtime.subscribeToStack((snapshot) => {  // ← concrete runtime
      setBlocks(snapshot.blocks);
    });
    return unsubscribe;
  }, [runtime]);

  return blocks;
}
```

```tsx
// ChromecastProxyRuntime.ts — 580 lines of boilerplate just to make the hooks work
// This class reimplements IScriptRuntime's internal subscriptions backed by RPC
class ProxyStack implements IRuntimeStack {
  // ...throws on push/pop (read-only), but the hooks don't know that...
  subscribe(listener: StackListener): () => void {
    this.listeners.add(listener);
    listener({ type: 'initial', blocks: this._blocks });
    return () => this.listeners.delete(listener);
  }
  _updateFromSnapshot(blocks: IRuntimeBlock[], event: StackEvent) { ... }
}

// receiver-rpc.tsx — must create this shim just to use the existing hooks
const ReceiverApp: React.FC<{ transport?: IRpcTransport }> = ({ transport }) => {
  const [proxyRuntime] = useState(() => new ChromecastProxyRuntime(transport));
  // The hooks don't know they're talking to a proxy — they think it's a real runtime
  return (
    <ScriptRuntimeProvider runtime={proxyRuntime}>
      <ReceiverTimerPanel />  {/* ← uses useStackTimers(), works because of proxy }
    </ScriptRuntimeProvider>
  );
};
```

#### After

```tsx
// Define what each display role actually needs — a small interface
interface IStackDisplaySource {
  subscribeToStack(listener: (snapshot: StackSnapshot) => void): () => void;
  getSnapshot(): StackSnapshot;
}

interface ITimerDisplaySource {
  getPrimaryTimer(): { elapsedMs: number; isRunning: boolean; isComplete: boolean } | null;
  getSecondaryTimers(): Array<{ blockKey: string; elapsedMs: number; role: string }>;
  getActiveControls(): { canStart: boolean; canPause: boolean; canStop: boolean; canNext: boolean };
  subscribeToTimerUpdates(listener: () => void): () => void;
}

interface IOutputDisplaySource {
  subscribeToOutput(listener: (output: IOutputStatement) => void): () => void;
  getOutputHistory(): readonly IOutputStatement[];
}
```

```tsx
// Local runtime adapter — wraps a real IScriptRuntime
class LocalRuntimeAdapter implements IStackDisplaySource {
  constructor(private runtime: IScriptRuntime) {}
  subscribeToStack(listener) { return this.runtime.subscribeToStack(listener); }
  getSnapshot() { return this.runtime.stack.snapshot(); }
}

// Chromecast proxy adapter — wraps the RPC proxy
class ChromecastAdapter implements IStackDisplaySource {
  constructor(private proxy: ChromecastProxyRuntime) {}
  subscribeToStack(listener) { return this.proxy.subscribeToStack(listener); }
  getSnapshot() { return this.proxy.stack.snapshot(); }
}
```

```tsx
// Refactored hook — depends on the interface, not IScriptRuntime
function useSnapshotBlocks(source?: IStackDisplaySource): readonly IRuntimeBlock[] {
  const runtime = useScriptRuntime();  // fallback
  const effectiveSource = source ?? (runtime as unknown as IStackDisplaySource);
  const [blocks, setBlocks] = useState<readonly IRuntimeBlock[]>([]);

  useEffect(() => {
    const unsubscribe = effectiveSource.subscribeToStack((snapshot) => {
      setBlocks(snapshot.blocks);
    });
    return unsubscribe;
  }, [effectiveSource]);

  return blocks;
}
```

```tsx
// Canvas window target — reads from a binding, uses the interface
const CanvasTimerWindow: React.FC<{ binding: RuntimeBinding }> = ({ binding }) => {
  const stackSource = useMemo(
    () => binding.runtime ? new LocalRuntimeAdapter(binding.runtime) : null,
    [binding.runtime]
  );

  return (
    <div className="canvas-window timer-window">
      <StackDisplay source={stackSource} />
      <TimerControls source={stackSource} />
    </div>
  );
};
```

#### Benefits

- **Depth**: Display-role interfaces are small (3-5 methods each). The adapter behind them is deep.
- **Chromecast simplification**: `ChromecastProxyRuntime` becomes a `ChromecastAdapter` implementing the interfaces — still needed, but the 580-line `IScriptRuntime` shim layer disappears.
- **New target types**: Canvas windows, fullscreen targets, and other output surfaces implement the interface. No more `ChromecastProxyRuntime` boilerplate.
- **Testability**: Mock an `IStackDisplaySource` with one method instead of constructing a `ScriptRuntime` with JIT compiler, event bus, and stack.

---

### Candidate 3: DisplayTarget — Generalized Output Surface Abstraction

**Files:** `src/components/organisms/cast/WorkbenchCastBridge.tsx`, `src/services/cast/rpc/ViewSession.ts`

#### Problem

`WorkbenchCastBridge` reads `workbenchSyncStore` (view mode, execution status, selected block, document items, analytics segments) and pushes state to a Chromecast receiver via RPC. It is tightly coupled to:
- The Zustand store shape
- Chromecast-specific `IRpcTransport`
- Being inside the `Workbench` component tree

There is no abstraction for "send this display state to a remote surface." A canvas window target, a fullscreen target, or a WebSocket-based remote would each need their own bridge component.

#### Before

```tsx
// WorkbenchCastBridge.tsx — reads Zustand, pushes to one specific transport
export const WorkbenchCastBridge: React.FC = () => {
  const castTransport = useWorkbenchSyncStore((s) => s.castTransport);  // Chromecast-only
  const viewMode      = useWorkbenchSyncStore((s) => s.viewMode);
  const runtime       = useWorkbenchSyncStore((s) => s.runtime);
  const analyticsSegs = useWorkbenchSyncStore((s) => s.analyticsSegments);
  const selectedBlock = useWorkbenchSyncStore((s) => s.selectedBlock);
  const documentItems = useWorkbenchSyncStore((s) => s.documentItems);

  useEffect(() => {
    if (!castTransport?.connected) return;
    const message = workbenchModeResolver.resolve({ viewMode, runtime, analyticsSegs, selectedBlock, documentItems });
    castTransport.send(message);  // ← hard-coded to IRpcTransport
  }, [castTransport, viewMode, runtime, analyticsSegs, selectedBlock, documentItems]);

  return null;  // renderless — but coupled to Chromecast semantics
};
```

#### After

```tsx
// DisplayTarget — a swappable output surface
interface IDisplayTarget {
  readonly id: string;
  readonly type: 'chromecast' | 'canvas-window' | 'fullscreen' | 'websocket';
  connect(): Promise<void>;
  disconnect(): void;
  send(state: DisplayState): void;
  onStateChange(handler: (targetId: string) => void): () => void;
}

// Chromecast adapter
class ChromecastTarget implements IDisplayTarget {
  readonly type = 'chromecast';
  constructor(private transport: IRpcTransport) {}
  async connect() { await this.transport.connect(); }
  disconnect() { this.transport.disconnect(); }
  send(state: DisplayState) { this.transport.send(state); }
  onStateChange(handler) { /* ... */ }
}

// Canvas window adapter — posts state to an iframe or broadcasts to opener
class CanvasWindowTarget implements IDisplayTarget {
  readonly type = 'canvas-window';
  constructor(private windowRef: Window) {}
  async connect() { /* ready immediately or wait for iframe load */ }
  disconnect() { this.windowRef.close(); }
  send(state: DisplayState) {
    this.windowRef.postMessage({ type: 'wod-display-state', state }, '*');
  }
  onStateChange(handler) { /* listen for 'beforeunload' etc. */ }
}

// Fullscreen adapter — re-renders locally in a different DOM subtree
class FullscreenTarget implements IDisplayTarget {
  readonly type = 'fullscreen';
  private renderRoot: ReactDOM.Root | null = null;

  connect() { /* nothing to connect */ }
  disconnect() { this.renderRoot?.unmount(); }
  send(state: DisplayState) {
    // Render the display into a portal or separate React root
    if (!this.container) return;
    if (!this.renderRoot) {
      this.renderRoot = ReactDOM.createRoot(this.container);
    }
    this.renderRoot.render(<TimerDisplay state={state} />);
  }
}
```

```tsx
// DisplayTargetRegistry — manages all registered targets
class DisplayTargetRegistry {
  private targets = new Map<string, IDisplayTarget>();

  register(target: IDisplayTarget) { this.targets.set(target.id, target); }
  unregister(id: string) { this.targets.get(id)?.disconnect(); this.targets.delete(id); }
  broadcast(state: DisplayState) { this.targets.forEach(t => t.send(state)); }
  bindTarget(targetId: string, binding: RuntimeBinding) {
    const target = this.targets.get(targetId);
    if (!target) return;
    // Target subscribes to the binding's runtime and forwards state
    const { runtime } = binding;
    if (!runtime) return;
    const unsub = runtime.subscribeToStack(() => {
      target.send(computeDisplayState(runtime));
    });
    // ...cleanup...
  }
}

// Simplified WorkbenchCastBridge — now just registers a target, not a full bridge
const WorkbenchCastBridge: React.FC<{ registry: DisplayTargetRegistry }> = ({ registry }) => {
  const transport = useWorkbenchSyncStore((s) => s.castTransport);

  useEffect(() => {
    if (!transport) return;
    const target = new ChromecastTarget(transport);
    registry.register(target);
    return () => registry.unregister(target.id);
  }, [transport]);

  return null;
};
```

#### Benefits

- **Locality**: "How do I send state to a remote display?" is answered once per adapter.
- **Leverage**: Adding a new target type is one adapter class. No new bridge component, no new context, no new provider.
- **Deletion test**: Delete `WorkbenchCastBridge`, `ChromecastProxyRuntime`, `ChromecastSenderViewSession` — complexity concentrates in `ChromecastTarget` adapter. The RPC bridge is gone, replaced by a typed interface.

---

### Candidate 4: Eliminate the Standalone Panel Runtime Path

**Files:** `src/app/editor/runtimeTimerModel.ts`, `src/components/organisms/editor/RuntimeTimerPanel.tsx`

#### Problem

`RuntimeTimerPanel` (the inline timer in the editor companion slot) creates its own runtime via `createRuntimeForBlock()`:

```tsx
// RuntimeTimerPanel.tsx line 172
useEffect(() => {
  if (!wizardDone && collectionItems.length > 0) return;
  const rt = createRuntimeForBlock(runtimeBlock);  // ← standalone creation
  if (!rt) return;
  setRuntime(rt);
  onRuntimeReady?.(rt);
  // subscribes to stack, output, cast transport...
}, [wizardDone, collectionItems]);
```

This is a second runtime creation path that bypasses `RuntimeLifecycleProvider`. It doesn't wire the tracker, doesn't add a `LocalRuntimeSubscription`, and can't receive analytics from the workbench. In the multi-runtime world, this panel should receive its runtime from a binding, not create its own.

#### Before

```tsx
// RuntimeTimerPanel.tsx — creates its own runtime
export const RuntimeTimerPanel: React.FC<RuntimeTimerPanelProps> = ({
  block, view, onClose, onComplete, ...
}) => {
  const [runtimeBlock] = useState(() => prepareRuntimeBlock(block));
  const [runtime, setRuntime] = useState<IScriptRuntime | null>(null);

  useEffect(() => {
    const rt = createRuntimeForBlock(runtimeBlock);  // bare factory call
    setRuntime(rt);
    // manually subscribes to stack, output
    // manually wires cast transport
    // no tracker, no analytics
  }, [runtimeBlock]);
  // ...
};
```

#### After

```tsx
// RuntimeTimerPanel.tsx — receives runtime from a binding context
export const RuntimeTimerPanel: React.FC<RuntimeTimerPanelProps> = ({
  block, view, onClose, onComplete, ...
}) => {
  // Reads from a rebindable context — same as any other display component
  const { runtime } = useContext(RuntimeBindingContext);
  const execution = useRuntimeExecution(runtime);
  const timers = useStackTimers();

  // No own useEffect for runtime creation
  // No manual stack subscription — hooks handle it
  // No manual output subscription — hooks handle it
  // ...
};
```

If the panel needs a runtime distinct from the workbench's main runtime, it requests one from a `RuntimeRegistry` (Candidate 1's multi-runtime manager), not by creating one ad-hoc.

#### Benefits

- **Consolidation**: One runtime creation path. If `RuntimeLifecycleProvider` gains a new wiring step, the inline timer gets it automatically.
- **Deletion test**: Delete `runtimeTimerModel.ts` and the runtime creation logic from `RuntimeTimerPanel` — complexity concentrates in `RuntimeLifecycleProvider`. No reappearance elsewhere.

---

## Implementation Order

| Priority | Candidate | Why First |
|----------|-----------|-----------|
| 1 | **RuntimeBinding** | Creates the seam between "runtime lifecycle" and "display binding." All other candidates depend on it. Without it, rebinding a display means unmounting the entire subtree. |
| 2 | **Display-role interfaces** | Refactors the hook layer to depend on interfaces rather than `IScriptRuntime`. Needed before adding new target types, otherwise every new target needs a full `ChromecastProxyRuntime`-style shim. |
| 3 | **DisplayTarget registry** | Generalizes the output surface abstraction. Can be built once the binding and interface layers exist. |
| 4 | **Eliminate standalone path** | Cleanup after Candidates 1-3 land. The standalone panel becomes a simple rebind to the workbench's runtime (or a separate slot in the registry). |

---

## Open Questions

1. **Should `ChromecastProxyRuntime` be renamed to `ChromecastAdapter`?** The proxy is currently a full `IScriptRuntime` shim to satisfy existing hooks. After Candidate 2, it becomes a set of interface adapters. The name should reflect what it is — an adapter, not a proxy runtime.

2. **Does the canvas window target need its own React root?** Fullscreen and canvas window targets are DOM siblings of the main workbench. They could use React portals into the same root, or their own `ReactDOM.createRoot`. The choice affects event handling and CSS isolation.

3. **Who owns the subscription manager per target?** The workbench's `SubscriptionManager` with `LocalRuntimeSubscription` is workbench-local. A remote target might need its own subscription to the same runtime (to receive stack events over RPC), or it might receive pre-serialized snapshots. Need to decide whether the registry manages one subscription per target or one subscription shared across targets.
