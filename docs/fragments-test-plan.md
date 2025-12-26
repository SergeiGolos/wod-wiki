# Fragments Test Plan (Base Parse)

This document is a **test plan** for validating the *base-level parse* produced by `MdTimerRuntime().read(source)` (Chevrotain lexer/parser + `MdTimerInterpreter` visitor).

It is modeled after the existing unit test style in [src/parser/__tests__/action-fragment.parser.test.ts](../src/parser/__tests__/action-fragment.parser.test.ts).

## Scope

- **In scope**: What fragments are created during parsing, how their fields are populated, and what *transforms/computed values* are applied.
- **Out of scope**: Runtime execution semantics (JIT compiler, metric inheritance, block strategies), UI rendering, and analytics conversion.

## Reference: Base Parse Pipeline

- Entry point: `new MdTimerRuntime().read(source)`
- Output: `WodScript` containing `statements: ICodeStatement[]`
- Each `ICodeStatement` contains:
  - `fragments: ICodeFragment[]`
  - `meta: CodeMetadata` (combined range of fragment metadata)
  - `id` set to `meta.line`
  - `children: number[][]` built after parsing based on indentation/columns

## General Test Pattern

For each fragment type:

1. Parse a minimal script containing exactly one statement.
2. Find the fragment by `FragmentType`.
3. Assert:
   - `fragmentType`
   - `image` and/or raw text fidelity
   - `value` shape and computed transforms
   - `collectionState` (when applicable)
   - `meta` line/range (at least `meta.line`), or any fragment-specific derived location fields

Recommended helper:

- `const parse = (source: string) => new MdTimerRuntime().read(source);`
- `const stmt = parse('...').statements[0];`
- `const frag = stmt.fragments.find(f => f.fragmentType === FragmentType.X) as XFragment;`

## Parse-Level / Statement-Level Behaviors (cross-cutting)

These are not “fragments”, but they affect how fragment tests should be structured.

### Statement fragment ordering

In `MdTimerInterpreter.wodBlock`, fragments are pushed in this order:

1. `lap` (if present)
2. `rounds`
3. `trend`
4. `duration`
5. `action`
6. `reps`
7. `effort`
8. `resistance`
9. `distance`

Plan tests (optional) to assert ordering when a line includes multiple fragment producers.

### Statement `meta` is a combined range

`statement.meta` is computed by `combineMeta(fragments.map(f => f.meta))`:

- `line` is taken from the earliest fragment meta
- `startOffset/columnStart` are the earliest
- `endOffset/columnEnd` are the latest

Plan tests (optional) to validate that a multi-fragment statement’s `meta` spans from the first token to the last.

### Parent/child relationships and grouping

`wodMarkdown` infers nesting via indentation (`meta.columnStart`):

- Each statement is assigned `id = meta.line`
- `parent` is assigned to all “open” parents with smaller columnStart
- `children` is a `number[][]` grouping:
  - consecutive `LapFragment(group='compose')` children are grouped together
  - `LapFragment(group='round')` and other types are single-item groups
  - if a child has **no** `LapFragment`, it behaves as `'repeat'` for grouping purposes

Plan tests for this separately from fragment tests (it’s a structural parse concern).

---

# Fragment-by-Fragment Test Plan

## Action (`FragmentType.Action`) — `ActionFragment`

### Syntax

- `[:start]`
- `[:!reset]` (pinned)
- `[:for time-fast]` (word spacing + hyphens)

### Computed values / transforms

From `timer.visitor.ts` + `ActionFragment`:

- Raw text is reconstructed from token stream inside the fence, with spacing rules:
  - inserts a single space only between adjacent “word” tokens
  - keeps punctuation/hyphens tight
  - trims final result
- `isPinned` is `raw.startsWith('!')`
- `name` is `raw` with leading `!` removed, then trimmed
- `value === name`
- `image === raw`
- `sourceLine === meta.line`

### Test cases

- Unpinned: `[:start]` preserves `raw/name/value` and `isPinned=false`
- Pinned: `[:!reset]` sets `isPinned=true`, strips `!` from `name`
- Spacing/hyphens: `[:for time-fast]` preserves hyphen and word spacing

(Already implemented in the existing test file.)

---

## Timer (`FragmentType.Timer`) — `TimerFragment`

### Syntax

- Regular timer: `:5`, `0:30`, `5:00`, `1:02:03`, `1:02:03:04`
- Collectible timer: `:?`
- Count-up modifier: `^5:00` or `^:?` (modifier is parsed as `Up` token preceding duration)

### Computed values / transforms

In `TimerFragment`:

- For explicit timers:
  - parses segments split by `:` into `days/hours/minutes/seconds` (right-aligned)
  - computes `original` in ms
  - sets `value = original`
  - `collectionState = Defined`
- For collectible `:?`:
  - `value = undefined`, `original = undefined`
  - `collectionState = RuntimeGenerated`
- `direction` getter:
  - `'up'` if `forceCountUp === true`
  - `'up'` if `value === undefined` (collectible)
  - `'down'` if `value > 0`
  - `'up'` if `value === 0`

### Test cases

- Parses `5:00` into minutes/seconds, `original/value` ms, `direction='down'`
- Parses `0:00` with `value=0` and `direction='up'`
- Parses `:?` with `collectionState=RuntimeGenerated`, `value=undefined`, `direction='up'`
- Parses `^5:00` with `forceCountUp=true` and `direction='up'` even though duration > 0

---

## Reps (`FragmentType.Rep`) — `RepFragment`

### Syntax

- Defined reps: `10`
- Collectible reps: `?`

### Computed values / transforms

- `value = reps` (number) or `undefined`
- `image = reps.toString()` or `'?'`
- `collectionState = Defined` when a number is provided
- `collectionState = UserCollected` when `?`

Note: `Number` token supports decimals, and visitor does `* 1`, so reps can currently parse as floats (e.g. `12.5`). Decide whether to lock that behavior with a test, or add a separate “should reject decimals” test if/when the grammar tightens.

### Test cases

- `10` yields `value=10`, `image='10'`, `collectionState=Defined`
- `?` yields `value=undefined`, `image='?'`, `collectionState=UserCollected`

---

## Distance (`FragmentType.Distance`) — `DistanceFragment`

### Syntax

- With number: `400m`, `1.5km`
- Default amount: `m` (no number)
- Collectible: `?m`

Units are tokenized by `Distance` token: `m|ft|mile|km|miles` (case-insensitive).

### Computed values / transforms

In `MdTimerInterpreter.distance()` + `DistanceFragment`:

- Amount selection:
  - `?` → `amount = undefined` (collectible)
  - number present → `amount = parsed number`
  - no number and no `?` → default `amount = 1`
- `value = { amount, units }`
- `image = '${amount} ${units}'` or `'? ${units}'`
- `collectionState = Defined` unless amount is `undefined`, then `UserCollected`

### Test cases

- `400m` yields `amount=400`, `units='m'`, `image='400 m'`, `collectionState=Defined`
- `m` yields default `amount=1`, `image='1 m'`
- `?m` yields `amount=undefined`, `image='? m'`, `collectionState=UserCollected`
- Case-insensitive units: `400M` yields units image `'M'` or `'m'`?
  - Current code uses token `.image`, so preserve input case (plan test should assert what you want: preserve case vs normalize). Today it preserves token image.

---

## Resistance (`FragmentType.Resistance`) — `ResistanceFragment`

### Syntax

- With number: `@135lb`, `20kg`, `1bw`
- Default amount: `lb` (no number)
- Collectible: `?kg`

Units are tokenized by `Weight` token: `kg|lb|bw` (case-insensitive).

### Computed values / transforms

In `MdTimerInterpreter.resistance()` + `ResistanceFragment`:

- Optional `@` prefix is accepted and ignored semantically
- Amount selection:
  - `?` → `amount = undefined` (collectible)
  - number present → `amount = parsed number`
  - no number and no `?` → default `amount = 1`
- `value = { amount, units }`
- `image = '${amount} ${units}'` or `'? ${units}'`
- `collectionState = Defined` unless amount is `undefined`, then `UserCollected`

### Test cases

- `@135lb` yields `amount=135`, `units='lb'`, `image='135 lb'`, `collectionState=Defined`
- `lb` yields default `amount=1`, `image='1 lb'`
- `?kg` yields `amount=undefined`, `image='? kg'`, `collectionState=UserCollected`

---

## Effort (`FragmentType.Effort`) — `EffortFragment`

### Syntax

- Examples: `hard`, `very hard`, `rpe 8` (note: `rpe` is Identifier, `8` is Number and is NOT part of effort rule)

### Computed values / transforms

In `MdTimerInterpreter.effort()`:

- The grammar allows `Identifier | AllowedSymbol | Minus` tokens.
- The visitor currently **only** uses `ctx.Identifier` for the string value:
  - `effort = ctx.Identifier.map(i => i.image).join(' ')`
  - `image = effort`
  - `value = effort`

Implication: hyphens/symbols inside effort are either (a) not accepted by the lexer/parser, or (b) accepted but ignored by the visitor when constructing `effort`. If you want effort to preserve hyphens (e.g. `moderate-hard`), you’ll either need a grammar/visitor update, or you should explicitly codify current behavior with tests.

### Test cases

- `very hard` yields `value='very hard'`, `image='very hard'`
- (Decision test) If you expect hyphen preservation, add a test for `moderate-hard` and decide whether current behavior is correct.

---

## Rounds (`FragmentType.Rounds`) — `RoundsFragment` (+ `RepFragment` for sequences)

### Syntax

- Label form: `(amrap)`, `(tabata)`
- Sequence form: `(5)`, `(5-10-15)`

### Computed values / transforms

In `MdTimerInterpreter.rounds()`:

- Label form:
  - produces a single `RoundsFragment(count=<label string>)`
- Sequence form:
  - parses a list of numbers separated by `-`
  - if there is exactly one number: produces `RoundsFragment(count=<that number>)`
  - if multiple numbers:
    - produces `RoundsFragment(count=<groups.length>)`
    - produces additional `RepFragment(group)` for each number in the sequence

### Test cases

- `(amrap)` yields `RoundsFragment.value === 'amrap'`
- `(5)` yields one `RoundsFragment.value === 5` and no additional `RepFragment`
- `(5-10-15)` yields:
  - `RoundsFragment.value === 3`
  - three `RepFragment` values: 5, 10, 15

---

## Increment / Trend (`FragmentType.Increment`) — `IncrementFragment`

### Syntax

- `^` (Up token categorized as Trend)

### Computed values / transforms

- `increment = image === '^' ? 1 : -1`
- `value = increment`

Note: The current token set only defines `^` as a `Trend`, so the `-1` branch is not reachable via the current base parse grammar.

### Test cases

- `^` yields `image='^'`, `increment=1`, `value=1`

---

## Lap (`FragmentType.Lap`) — `LapFragment`

### Syntax

- `+` at start of statement → compose (`group='compose'`, `image='+'`)
- `-` at start of statement → round (`group='round'`, `image='-'`)

### Computed values / transforms

- `value = group` where `group` is one of: `'round' | 'compose' | 'repeat'`

Important note: `timer.visitor.ts` contains logic intending to add a `LapFragment('repeat')` to child statements that lack lap markers, but parent assignment happens after `wodBlock` runs. So today, most “repeat” semantics are handled structurally via `getChildLapFragmentType()` defaulting to `'repeat'` when no lap fragment exists.

### Test cases

- `+ 5:00` yields `LapFragment.group === 'compose'`
- `- 5:00` yields `LapFragment.group === 'round'`
- Structural test (separate from fragment tests): a child without `+/-` should still be treated as `'repeat'` for grouping (validate via `children` grouping, not fragment list).

---

## Text (`FragmentType.Text`) — `TextFragment` (NOT produced by base parse today)

`TextFragment` exists in `src/fragments/TextFragment.ts` but is not created by `MdTimerInterpreter`.

Plan:

- If/when the base grammar adds a “text” production, create parser tests similar to other fragments.
- Today, add no base-parse tests for `TextFragment` unless you are testing runtime-derived fragments (out of scope for this document).
