# Fragment Types — Current vs Expected

## Summary

This document lists every fragment type, what data is populated by each class, its `behavior` classification, and its data pipeline role.

> All fragments implement `ICodeFragment` (see `src/core/models/CodeFragment.ts`).

## Data Pipeline

Fragments flow through a pipeline based on their origin and behavior:

| Stage | Origin | Behavior | Example |
|-------|--------|----------|---------|
| **Plan** | `parser` | `Defined` / `Hint` | TimerFragment, RepFragment, RoundsFragment |
| **Compile** | `compiler` | `Defined` / `Hint` | DurationFragment |
| **Record** | `runtime` | `Recorded` | SpansFragment, CurrentRoundFragment, SoundFragment, SystemTimeFragment |
| **Calculate** | `collected` | `Calculated` | ElapsedFragment, TotalFragment (pushed on pop) |

## Base Interface (`ICodeFragment`)

| Property | Type | Notes |
|----------|------|-------|
| `image` | `string?` | Human-readable display text |
| `value` | `unknown?` | Typed payload |
| `type` | `string` | Legacy discriminator (used by Monaco providers) |
| `fragmentType` | `FragmentType` | Canonical enum discriminator |
| `meta` | `CodeMetadata?` | Source code location |
| `behavior` | `MetricBehavior` | Intent classification (Defined, Hint, Recorded, Calculated) |
| `origin` | `FragmentOrigin` | Where the fragment was created |
| `sourceBlockKey` | `string?` | Block that owns this fragment |
| `timestamp` | `Date?` | When created |

---

## Parser-Origin Fragments

| Fragment | `fragmentType` | `type` | `behavior` | Populated Fields |
|----------|----------------|--------|------------|------------------|
| `TimerFragment` | `Timer` | `"duration"` | `Defined` (value set) / `Hint` (`:?` collectible) | `image`, `value` (ms), `meta`, `origin`, time parts, `forceCountUp`, `direction` |
| `RepFragment` | `Rep` | `"rep"` | `Defined` (value set) / `Hint` (`?` collectible) | `image`, `value`/`reps`, `meta`, `origin` |
| `EffortFragment` | `Effort` | `"effort"` | `Defined` | `image`/`value` (exercise string), `meta`, `origin` |
| `DistanceFragment` | `Distance` | `"distance"` | `Defined` / `Hint` (collectible) | `image`, `value` (`{amount, units}`), `meta`, `origin` |
| `ResistanceFragment` | `Resistance` | `"resistance"` | `Defined` / `Hint` (collectible) | `image`, `value` (`{amount, units}`), `meta`, `origin` |
| `RoundsFragment` | `Rounds` | `"rounds"` | `Defined` | `image`, `value`/`count`, `meta`, `origin` |
| `ActionFragment` | `Action` | `"action"` | `Defined` | `raw`, `image`, `value`, `isPinned`, `sourceLine`, `meta`, `origin` |
| `IncrementFragment` | `Increment` | `"increment"` | `Hint` | `image` (`^`/`v`), `value`/`increment`, `meta`, `origin` |
| `GroupFragment` | `Group` | `"group"` | `Defined` | `image`, `value`/`group`, `meta`, `origin` |
| `TextFragment` | `Text` | `"text"` | `Defined` | `image`/`text`, `value` (`{text, level}`), `meta`, `origin` |

## Compiler-Origin Fragments

| Fragment | `fragmentType` | `type` | `behavior` | Populated Fields |
|----------|----------------|--------|------------|------------------|
| `DurationFragment` | `Duration` | `"duration"` | `Defined` / `Hint` (collectible) | `image`, `value` (ms), `meta`, `origin`, time parts, `forceCountUp`, `direction` |

> Note: `TimerFragment.type` and `DurationFragment.type` both use `"duration"`. This is intentional — Monaco providers match on `type: 'duration'`. Disambiguate via `fragmentType` enum (`Timer` vs `Duration`).

## Runtime-Origin Fragments

| Fragment | `fragmentType` | `type` | `behavior` | Populated Fields |
|----------|----------------|--------|------------|------------------|
| `CurrentRoundFragment` | `CurrentRound` | `"current-round"` | `Recorded` | `value` (`{current, total}`), `image`, `sourceBlockKey`, `timestamp`, `origin` |
| `SpansFragment` | `Spans` | `"spans"` | `Recorded` | `spans` (`TimeSpan[]`), `value` (getter), `image` (getter), `sourceBlockKey`, `timestamp`, `origin` |
| `ElapsedFragment` | `Elapsed` | `"elapsed"` | `Calculated` | `value` (elapsed ms), `image` (formatted), `sourceBlockKey`, `timestamp`, `origin` |
| `TotalFragment` | `Total` | `"total"` | `Calculated` | `value` (ms), `image` (formatted), `sourceBlockKey`, `timestamp`, `origin` |
| `SystemTimeFragment` | `SystemTime` | `"system-time"` | `Recorded` | `value` (`Date`), `image` (ISO), `sourceBlockKey`, `origin` |
| `SoundFragment` | `Sound` | `"sound"` | `Recorded` | `sound`, `trigger`, `value` (`{sound, trigger, atSecond?}`), `image`, `meta`, `origin` |

---

## Round Fragment Split

The round concept is now represented by **two** fragment types:

| Concern | Fragment | Origin | When Created |
|---------|----------|--------|--------------|
| **Plan** (how many rounds total) | `RoundsFragment` | parser | Parsing `(3)`, `(21-15-9)`, `(EMOM)` |
| **Progress** (which round is active) | `CurrentRoundFragment` | runtime | `RoundInitBehavior.onMount()`, `RoundAdvanceBehavior.onNext()` |

`CurrentRoundFragment` is used by:
- `RoundInitBehavior` — creates initial round state in memory
- `RoundAdvanceBehavior` — updates round state on each advance
- `RoundOutputBehavior` — includes in milestone outputs
- `PromoteFragmentBehavior` — promotes to children (configured with `FragmentType.CurrentRound`)

---

## Resolved Issues

- ✅ **`behavior` now set on all 17 fragment classes** — consumers can rely on intent classification
- ✅ **`SoundFragment` now persists `meta`** — `this.meta = options.meta` added
- ✅ **Round fragment split** — `RoundsFragment` (plan) vs `CurrentRoundFragment` (runtime progress)
- ✅ **`PromoteFragmentBehavior` updated** — uses `FragmentType.CurrentRound` in strategy configs

## Remaining Items

- ⚠️ `TimerFragment`/`DurationFragment` `type` collision — both use `"duration"`. Disambiguate via `fragmentType` enum.
- ⚠️ `SystemTimeFragment.timestamp` — implemented as getter from `value`, inconsistent with other runtime fragments that store it as a field.
- ⚠️ Missing `sourceBlockKey`/`timestamp` on parser-origin fragments — these are typically set by the compiler or runtime, not the parser.
