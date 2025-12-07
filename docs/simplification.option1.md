# Simplification Option 1 — Stack-Orchestrated Instrumentation

This option keeps the stack as the single place that runs lifecycle and instrumentation but makes the instrumentation pluggable through injected services and hooks. It minimizes churn for callers because the public surface (`push`, `pop`, `popWithLifecycle`, `current`, `blocks`) remains unchanged while still slimming internal responsibilities. Use this when you need the smallest refactor footprint and want to avoid touching `ScriptRuntime` orchestration in the first pass.

## Responsibilities
- **RuntimeStack:** validation, depth limits, storage, lifecycle sequencing, and instrumentation execution via injected services (tracker, wrapper, logger). No hard-coded implementations—stack calls provided hooks/services.
- **ScriptRuntime:** wires services into the stack, calls stack APIs. Does not manually end spans or unregister handlers.
- **Services (tracker/wrapper/logger):** supplied to the stack; own their state. Stack triggers them at the right lifecycle moments.

## API Shape
- `push(block: IRuntimeBlock): void` — unchanged signature; stack invokes `hooks.onBeforePush` + `tracker.startSpan` + optional wrapper before storing.
- `pop(): IRuntimeBlock | undefined` — unchanged raw pop (no lifecycle side-effects beyond storage removal).
- `popWithLifecycle(): IRuntimeBlock | undefined` — runs unmount → pop → dispose → context.release → tracker.endSpan → unregisterByOwner → parent.next → wrapper cleanup. Return type stays the old style for minimal churn.
- Optional: `configure(hooks, services)` during stack construction to pass instrumentation dependencies.

## Flow Details
### push
1) Stack validates and enforces depth.
2) Stack calls `hooks.onBeforePush` (if provided) so callers can observe.
3) Stack wraps/starts tracking using injected services.
4) Stack pushes the (maybe wrapped) block and may log/debug via services.

### popWithLifecycle
1) Stack runs `current.unmount(runtime)` safely.
2) Stack pops the block from storage.
3) Stack runs `dispose` + `context.release` on the popped block.
4) Stack invokes injected services: `tracker.endSpan`, `eventBus.unregisterByOwner(popped.key)`, `wrapper.cleanup`, and logs.
5) Stack calls `parent.next` if present.

## Pros
- Smallest caller change footprint; existing stack usage remains valid.
- Centralized ordering remains inside the stack, reducing orchestration drift risk.
- Services are injectable/mocked, improving testability without touching runtime.

## Cons
- Stack still owns many concerns conceptually (tracking/wrapping/logging), just via injection.
- Harder to fully separate lifecycle vs instrumentation for future features.
- Multiple responsibilities in one class can still obscure failures and make reasoning harder.

## Migration Steps
1) Add service/hook injection points to `RuntimeStack` constructor (`tracker`, `wrapper`, `logger`, `hooks`).
2) Replace hard-coded instrumentation with calls to injected services.
3) Keep `popWithLifecycle` return type as-is to avoid ripple effects; ensure unregister + tracker end still happen inside stack.
4) Update stack tests to assert service calls rather than concrete implementations. Minimal or no changes to runtime tests.

## Decision Signals
Choose Option 1 if:
- You need a quick win with low risk and minimal surface changes.
- You prefer to centralize ordering inside the stack and avoid runtime changes for now.
- You want to defer orchestrator refactors but still improve testability via injection.

Risk: Stack remains a multi-responsibility class; reassess later if instrumentation grows or if lifecycle bugs persist.