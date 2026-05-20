# Split IAnalyticsStage into IRealtimeProcessor and ISummaryProcessor

The current `IAnalyticsStage` interface conflates two temporally distinct roles behind
optional methods (`enrich?` and `project?`). We split it into `IRealtimeProcessor`
(called per segment as it arrives) and `ISummaryProcessor` (called once after the workout
ends). This makes the real-time / summary distinction explicit in the type system,
eliminates optional-method routing guards in `AnalyticsEngine`, and lets each processor
category be tested in complete isolation.

**Status**: proposed

## Considered Options

**Keep a single interface** — would avoid a migration, but the optional-method pattern
means the type system cannot enforce which role a class fills, and tests for enrichers
still have to stub `project()`.

**Keep a single interface but make both methods required** — forces every processor to
implement both phases, which is worse: a pure summarizer must implement a no-op `enrich`
that returns the input unchanged.

**Split into two interfaces (chosen)** — a class that enriches only implements
`IRealtimeProcessor`; a class that summarizes only implements `ISummaryProcessor`; a
class that does both implements both. The engine holds two typed lists. No optional
methods, no routing guards.

## Consequences

`IAnalyticsStage` is kept as a deprecated union alias for one release cycle. All existing
processors migrate as part of this work. Callers that reference `IAnalyticsStage` will
receive a deprecation warning until the alias is removed.
