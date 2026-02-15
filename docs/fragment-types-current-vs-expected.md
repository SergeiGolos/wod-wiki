# Fragment types — current vs expected

Summary
- This document lists every fragment type, what data is currently populated by each class (`Current`), and what additional fields are expected but not populated (`Expected`).

> Note: all fragments implement `ICodeFragment` (see `src/core/models/CodeFragment.ts`).

## Base interface (`ICodeFragment`) properties

| Property | Type |
|---|---|
| `image` | `string?` |
| `value` | `unknown?` |
| `type` | `string` |
| `fragmentType` | `FragmentType` |
| `meta` | `CodeMetadata?` |
| `behavior` | `MetricBehavior?` |
| `origin` | `FragmentOrigin?` |
| `sourceBlockKey` | `string?` |
| `timestamp` | `Date?` |

---

## Fragment table (Current vs Expected)

### Parser-origin fragments

| Fragment | `fragmentType` | `type` | Current (populated) | Expected (missing) |
|---|---:|---|---|---|
| `TimerFragment` | `Timer` | `"duration"` | `image`, `value` (ms or `undefined`), `meta`, `origin`, parsed time parts (`days|hours|minutes|seconds`), `forceCountUp`, `original`, `direction` (getter) | `behavior` (should indicate `defined`/`collected`), `sourceBlockKey`, `timestamp` |
| `RepFragment` | `Rep` | `"rep"` | `image`, `value`/`reps`, `meta`, `origin` | `behavior`, `sourceBlockKey`, `timestamp` |
| `EffortFragment` | `Effort` | `"effort"` | `image`/`value` (exercise string), `meta`, `origin` | `behavior`, `sourceBlockKey`, `timestamp` |
| `DistanceFragment` | `Distance` | `"distance"` | `image`, `value` (`{amount, units}`), `units`, `meta`, `origin` | `behavior`, `sourceBlockKey`, `timestamp` |
| `ResistanceFragment` | `Resistance` | `"resistance"` | `image`, `value` (`{amount, units}`), `units`, `meta`, `origin` | `behavior`, `sourceBlockKey`, `timestamp` |
| `RoundsFragment` | `Rounds` | `"rounds"` | `image`, `value`/`count`, `meta`, `origin` | `behavior`, `sourceBlockKey`, `timestamp` |
| `ActionFragment` | `Action` | `"action"` | `raw`, `image`, `value` (`name`), `isPinned`, `sourceLine`, `meta`, `origin` | `behavior`, `sourceBlockKey`, `timestamp` |
| `IncrementFragment` | `Increment` | `"increment"` | `image` (`^`/`v`), `value`/`increment`, `meta`, `origin` | `behavior` (should be a hint), `sourceBlockKey`, `timestamp` |
| `GroupFragment` | `Group` | `"group"` | `image`, `value`/`group`, `meta`, `origin` | `behavior`, `sourceBlockKey`, `timestamp` |
| `TextFragment` | `Text` | `"text"` | `image`/`text`, `value` (`{text, level}`), `meta`, `origin` | `behavior`, `sourceBlockKey`, `timestamp` |

### Compiler-origin fragments

| Fragment | `fragmentType` | `type` | Current (populated) | Expected (missing) |
|---|---:|---|---|---|
| `DurationFragment` | `Duration` | `"duration"` (note: string collides with `TimerFragment`) | `image`, `value` (ms or `undefined`), `meta`, `origin`, parsed time parts, `forceCountUp`, `original`, `direction` (getter) | `behavior`, `sourceBlockKey`, `timestamp` — also **type-string collision** with `TimerFragment` (recommend using `"duration.compiler"` or rely on `fragmentType`) |

### Runtime-origin fragments

| Fragment | `fragmentType` | `type` | Current (populated) | Expected (missing) |
|---|---:|---|---|---|
| `SpansFragment` | `Spans` | `"spans"` | `spans` (`TimeSpan[]`), `value` (getter), `image` (getter), `isOpen` (getter), `sourceBlockKey`, `timestamp`, `origin` | `behavior` |
| `ElapsedFragment` | `Elapsed` | `"elapsed"` | `value` (elapsed ms), `image` (formatted), `sourceBlockKey`, `timestamp`, `origin` | `behavior` |
| `TotalFragment` | `Total` | `"total"` | `value` (ms), `image` (formatted), `sourceBlockKey`, `timestamp`, `origin` | `behavior` |
| `SystemTimeFragment` | `SystemTime` | `"system-time"` | `value` (`Date`), `image` (ISO), `sourceBlockKey`, `origin`, `timestamp` (getter from `value`) | `behavior` (and note: `timestamp` implemented as getter — inconsistent with other runtime fragments) |
| `SoundFragment` | `Sound` | `"sound"` | `sound`, `trigger`, `value` (`{sound, trigger, atSecond?}`), `image`, `origin` | `behavior`, `sourceBlockKey`, `timestamp`, **`meta` is accepted by constructor but not stored (BUG)** |

---

## Known issues & recommendations

- **`behavior` is never set by any fragment** — add `behavior` values (e.g. `Defined`, `Collected`, `Calculated`, `Recorded`, `Hint`) where appropriate so consumers can rely on intent. ✅
- **`TimerFragment` / `DurationFragment` `type` collision** — avoid switching on `type` string; prefer `fragmentType` enum or update `type` string to be unique. ⚠️
- **`SoundFragment` constructor accepts `meta` but does not assign it** — assign `this.meta = options.meta` to preserve source metadata. 🐞
- **`SystemTimeFragment.timestamp` inconsistent** — consider storing `timestamp` as a field for parity with `ElapsedFragment`/`TotalFragment`.

## Next steps (suggested)
1. Add `behavior` assignments in fragment constructors where semantically appropriate.  
2. Fix `SoundFragment` to persist `meta`.  
3. Resolve `type` string collision or update code paths to rely on `fragmentType`.  
4. Add unit tests for fragments to assert `meta`, `behavior`, `sourceBlockKey`, and `timestamp` expectations.

---

File created: `docs/fragment-types-current-vs-expected.md`
