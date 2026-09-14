# Playground — Domain Context

The shared language for routes, settings, and query surfaces in the playground app.
Terms here are canonical; prefer them over the listed aliases.

## Routes & query state

**Stream Route**:
A route mounting the shared queriable stream (`/journal`, `/collections`, `/feeds`,
`/feed`, `/library`, `/efforts`, `/results`, `/results/segments`, `/results/:resultId`),
each backed by a **Stream Profile**.
_Avoid_: library page (that is one stream route among many), listing route.

**Stream Profile**:
The in-code per-route descriptor (`defaultWql`, source `typeOptions`, legacy-param
salvage) resolving from the pathname. Code-owned and read-only at runtime.
_Avoid_: profile settings, route config (that is the user's **Route WQL Config**).

**System Default**:
The in-code, read-only fallback a stream route or the palette uses where no
**Route WQL Config** exists. Visible read-only in Settings; reset restores it.
_Avoid_: hardcoded default, preset, factory default.

**Route WQL Config**:
The user's per-route override: a default WQL query plus the option lists behind
the source dropdown and Group-By control. Persisted client-side; absent fields
fall back to the **System Default** individually.
_Avoid_: profile (taken), preset, preference blob.

**Landing Default**:
The query a surface seeds when reached bare — no `?q=` in the URL. Resolution
order: explicit `?q=`, else **Route WQL Config**, else **System Default**.
Config changes never rewrite an existing URL state.
_Avoid_: initial query (ambiguous with palette seeding), seed query.

## Settings

**Settings Sub-page**:
A `/settings/<name>` route rendered by the settings shell, per the existing
appearance/system/calcs pattern.
_Avoid_: tab (reserved for the in-page sections of `/settings/appearance`-style pages).

## Composer

**Quick Edit Pill**:
The composer's click-to-edit clause chip (`TokenSlotPill`): source, time, metric,
filter, calc — a transient working set over the parsed query.
_Avoid_: chip (overloaded with the read-only filter chips in the stream query bar),
token (parser concept).

**Nudge**:
The non-blocking prompt shown for a configured option left without a value: the
query runs without that clause and the prompt clears once a value is picked.
_Avoid_: required (implies blocking), force, validation error.
