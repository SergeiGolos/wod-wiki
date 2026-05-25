# PRD: Rock Climbing Dialect

**Area**: Whiteboard Language / Dialects / Analytics  
**Status**: Draft  
**Source**: Rock climbing progress tracking research report  
**Last Updated**: 2026-05-25

---

## 1. Summary

WOD Wiki needs a first-class `climb` dialect so climbers can log indoor bouldering, outdoor sport/trad days, project attempts, and climbing-specific training in portable Markdown while still participating in WOD Wiki's parser, runtime, review, and analytics systems.

The climbing research shows that durable progress tracking depends less on a specific app and more on consistently recording a small set of domain variables: date/location, route or problem identity, grade, send type, attempt count, and session notes. Existing WOD Wiki fences can technically hold this information as free text, but they cannot make climbing intent, climbing grades, send quality, project state, or route-style analytics first-class.

This PRD defines a `climb` fence that starts as a semantic dialect over the shared Whiteboard grammar and grows toward climbing-aware metrics, dashboards, import/export, and analytics.

---

## 2. Problem

Climbing sessions do not behave like conventional workout definitions.

1. **Progress is attempt-based, not only duration- or rep-based.** A meaningful session might include twelve attempts on one project, three warmup routes, and no conventional timer.
2. **Grades are domain-specific.** Bouldering uses V-scale or Fontainebleau grades; roped climbing uses YDS, French, UIAA, Ewbank, British technical grades, and others.
3. **Send type matters as much as grade.** Onsight, flash, redpoint, repeat, dogged, top-rope, and did-not-finish outcomes communicate different levels of mastery.
4. **Location context is central.** Gym, crag, wall, sector, route setter, temperature, humidity, rock condition, and crowding can explain performance shifts.
5. **Projects evolve across sessions.** Climbers need beta notes, high points, attempt history, and prior failures to accumulate around a route or problem.
6. **Existing apps fragment ownership.** Strava is socially useful but weak for climbing-specific data; purpose-built apps are strong but can lock data away. WOD Wiki can provide a markdown-native middle path.

Without a climbing dialect, users must flatten this domain into vague notes such as `V6 project hard`, which prevents reliable dashboards, review grids, training analysis, or long-term portability.

---

## 3. Goals

1. Add a `climb` Markdown fence for climbing logs, plans, and training records.
2. Preserve the current Whiteboard shared parser model for launch while adding climbing-specific semantic analysis.
3. Recognize climbing grades, send types, attempt counts, climbing disciplines, and session context as structured metrics.
4. Support indoor bouldering, outdoor bouldering, sport climbing, trad climbing, top rope, aid, and training sessions without forcing one rigid template.
5. Make climbing logs portable to and from Markdown, CSV, and external systems such as Strava, theCrag, 8a.nu, KAYA, Redpoint, Notion, Obsidian, and spreadsheets.
6. Enable review and analytics surfaces: grade pyramid, max grade over time, consistency grade, attempts by project, session frequency, V-sum, route volume, session RPE, and conditions correlations.
7. Keep first-entry friction low enough that climbers can log immediately after a session.

---

## 4. Non-goals

The first release does **not** include:

- A global route database or guidebook replacement
- GPS, barometric altimeter, Apple Watch, or automatic ascent detection
- Community rankings, scorecards, or leaderboards
- Automated grade conversion with authoritative guarantees
- ML-based beta extraction or route style classification
- Full two-way sync with third-party climbing apps
- Replacing the existing `wod`, `log`, or `plan` dialects

The architecture should remain compatible with these capabilities, but they are not launch blockers.

---

## 5. Primary Personas

### Climber

Wants to record what they climbed, how they sent it, what they learned, and whether they are improving across weeks and seasons.

### Coach

Wants structured session data, attempt history, session RPE, consistency metrics, and weakness patterns without requiring athletes to use a proprietary app.

### Markdown Power User

Wants portable climbing logs that work in Obsidian, Git, static sites, scripts, and WOD Wiki without duplicate entry.

### Analytics Engine

Needs deterministic climbing metrics with provenance: parser-derived, dialect-inferred, imported, user-entered, or estimated.

### Developer

Needs typed metric contracts, dialect test fixtures, import/export seams, and low-risk extension points.

---

## 6. Product Decisions

### Decision 1: `climb` Fence

**Decision**  
Introduce `climb` as a Whiteboard dialect fence.

Autocomplete labels it as:

> `climb — Climbing log`

**Rationale**

- The fence communicates domain intent immediately to readers and tooling.
- It lets analytics profiles activate climbing processors without guessing from free text.
- It aligns with current dialect docs where `wod`, `log`, and `plan` share the core parser but differ by intent.

### Decision 2: Shared Grammar First, Semantic Dialect Second

**Decision**  
The first implementation uses the shared Whiteboard core syntax and a `ClimbDialect` analyzer. Climbing-specific interpretation happens after parsing through hints and metrics.

**Example**

````markdown
```climb
date: 2026-05-26
location: Sender One LAX
discipline: bouldering

(Warmup)
  [Slab Warmup] V0 flash @1 // quiet feet
  [Jug Ladder] V2 flash @1

(Project)
  [The Shield] V7 redpoint @12 // engage core before crux reach
```
````

**Rationale**

- The existing parser can already represent grouped statements, actions, quantities, and comments.
- A semantic dialect is lower-risk than a separate Chevrotain grammar.
- This keeps `climb` compatible with current runtime, review, and editor architecture.

### Decision 3: Canonical Climbing Metrics

**Decision**  
The dialect should normalize climbing concepts into canonical metrics.

| Metric | Purpose | Examples |
|--------|---------|----------|
| `ClimbDiscipline` | Type of climbing | `bouldering`, `sport`, `trad`, `top-rope`, `hangboard` |
| `ClimbGrade` | Route/problem difficulty | `V6`, `7A`, `5.11d`, `6c+`, `24` |
| `SendType` | Outcome quality | `onsight`, `flash`, `redpoint`, `repeat`, `dogged`, `dnf` |
| `AttemptCount` | Number of attempts | `@1`, `@8`, `attempts: 12` |
| `RouteName` | Named climb/problem | `[The Shield]`, `[Black Magic]` |
| `HighPoint` | Furthest progress without send | `bolt 6`, `move 9`, `topout` |
| `Condition` | Environmental state | `70F`, `humid`, `good friction` |
| `SessionRPE` | Subjective session load input | `rpe: 8` |
| `EnergyLevel` | Pre-session readiness | `energy: 7` |

**Rationale**

- These are the variables consistently identified across climbing apps, journals, training literature, and spreadsheet workflows.
- Canonical metrics unlock dashboards without forcing one note template.

### Decision 4: Grade Systems Are Explicit

**Decision**  
Every parsed grade keeps both its raw value and detected or declared grade system.

```ts
interface IClimbGradeMetric {
  raw: string;
  system: 'v-scale' | 'font' | 'yds' | 'french' | 'uiaa' | 'ewbank' | 'british' | 'dankyu' | 'unknown';
  normalizedRank?: number;
}
```

**Rules**

- `V6` maps to `v-scale`.
- `5.11d` maps to `yds`.
- `7A` maps to `font` when the session discipline is bouldering.
- `6c+` maps to `french` when the session discipline is sport, trad, or top-rope.
- Ambiguous grades remain `unknown` unless the session declares `grade_system`.
- Conversion is display-only in the first release; raw grade remains authoritative.

**Rationale**

- Climbing grades are local and style-dependent.
- Preserving raw grades prevents false precision from conversion tables.
- A normalized rank enables pyramids and trends while keeping uncertainty visible.

### Decision 5: Send Types Are Closed Vocabulary With Aliases

**Decision**  
The dialect recognizes a closed send-type vocabulary with common aliases.

| Canonical | Aliases |
|-----------|---------|
| `onsight` | `os` |
| `flash` | `fl` |
| `redpoint` | `rp`, `sent`, `send` |
| `repeat` | `repeat`, `re-send` |
| `dogged` | `hangdog`, `with falls`, `a0` |
| `top-rope` | `tr`, `toprope` |
| `did-not-finish` | `dnf`, `not sent`, `attempted` |

**Rationale**

- Send type is a core progress signal.
- A closed vocabulary makes analytics reliable.
- Aliases preserve quick logging conventions.

### Decision 6: Session Properties Carry Context

**Decision**  
The `climb` dialect supports session-level properties using existing Whiteboard property syntax.

Recommended properties:

```text
date: 2026-05-26
location: Sender One LAX
area: Competition Wall
discipline: bouldering
grade_system: v-scale
duration: 2.5
rpe: 8
energy: 7
partners: Miguel Torres
conditions: cool good friction
```

**Rationale**

- Session-level data should not be repeated on every ascent line.
- Existing property syntax is enough for MVP context capture.
- More complex values can live in Markdown frontmatter outside the fence when needed.

### Decision 7: Analytics Focus on Climbing Progress

**Decision**  
Climbing analytics should prioritize progress signals climbers actually use.

Launch analytics:

- Session count by week/month
- Max grade by discipline over time
- Grade pyramid by send type
- Attempt count by route/problem
- V-sum for bouldering sessions
- Total routes/problems by session
- Consistency grade approximation
- Project status: active, sent, retired
- Session load: duration x Session RPE

Future analytics:

- Conditions correlation
- Route style distribution: slab, overhang, crimps, slopers, dynos, endurance
- Power-endurance flags from repeated high-attempt failures
- Grade conversion comparison dashboards
- Import parity reports for Strava/theCrag/8a.nu exports

**Rationale**

- Maximum grade alone is noisy and incomplete.
- Grade pyramids and consistency grades reveal progress during plateaus.
- Attempt history is critical for project planning.

### Decision 8: Portable Export and Import

**Decision**  
Climbing sessions must support Markdown-first storage and CSV-shaped export/import.

Minimum CSV columns:

```text
date,location,area,discipline,route_name,grade,grade_system,send_type,attempts,high_point,duration,rpe,energy,partners,conditions,notes
```

**Rationale**

- Climbing app ecosystems are fragmented.
- Portability is a differentiator for WOD Wiki.
- CSV provides a practical bridge to spreadsheets, Notion, Obsidian Dataview scripts, theCrag exports, and custom analysis.

---

## 7. User Stories

1. As a climber, I want to write a `climb` block in Markdown, so I can keep my climbing log next to my training notes.
2. As a climber, I want to record route/problem name, grade, send type, and attempts on one line, so logging after a session is fast.
3. As a boulderer, I want WOD Wiki to calculate V-sum, max grade, total problems, and grade pyramid, so I can see whether volume and intensity are balanced.
4. As a sport climber, I want to record route attempts, high points, falls, and redpoints, so I can track progress on outdoor projects.
5. As a coach, I want send type and attempt count separated from free text, so I can compare athletes without reading every note manually.
6. As a climber, I want project notes to accumulate around named routes/problems, so returning to an old project includes beta history.
7. As a markdown user, I want my climbing log to remain readable in plain text, so I am not locked into WOD Wiki.
8. As an analytics user, I want grade-system ambiguity to be visible, so conversions do not imply false precision.
9. As a Strava user, I want to generate a compact description summary from a `climb` block, so I can share socially without duplicating notes.
10. As a developer, I want fixture-driven tests for common climbing lines, so changes to grade and send parsing are safe.

---

## 8. Example Syntax

### Indoor Bouldering

````markdown
```climb
date: 2026-05-26
location: Sender One LAX
discipline: bouldering
duration: 2.5
rpe: 8
energy: 7

(Warmup)
  [Slab Warmup] V0 flash @1 // quiet feet
  [Jug Ladder] V2 flash @1

(Volume)
  [Crimp Traverse] V3 flash @1
  [Pinch Overhang] V4 redpoint @2
  [Sloper Topout] V5 flash @1

(Project)
  [The Shield] V7 redpoint @12 // engage core before crux reach
```
````

### Outdoor Sport Day

````markdown
```climb
date: 2026-05-20
location: Red Rock Canyon
area: Calico Basin
discipline: sport
grade_system: yds
duration: 8
rpe: 7
conditions: sunny warm light wind

[The Gift] 5.10b onsight @1 // bolt 5 step-up crux
[Plumber's Crack] 5.11a redpoint @3 // stem instead of layback
[Black Magic] 5.11d redpoint @4 // crux at bolts 6 and 8
[Cinnamon Slab] 5.9 onsight @1 // cooldown
```
````

### Hangboard Session

````markdown
```climb
date: 2026-05-22
location: Home Training Setup
discipline: hangboard
protocol: max hangs
duration: 1.25
rpe: 8
energy: 8

[Open hand] 20mm +30lb 7s @3 // all reps completed
[Half crimp] 20mm +25lb 7s @3 // third rep slipped at 6s
[Wide pinch] 45mm +15lb 7s @3 // strong today
[Sloper rail] bw 7s @3 // failed reps 2 and 3
```
````

---

## 9. Implementation Plan

### Phase 1: Documentation and Contracts

- Add `climb` PRD and ADR.
- Add `docs/whiteboard-language/dialect-climb.md` when implementation begins.
- Define climbing metric interfaces and canonical send type enum.
- Add parser/dialect fixture examples for indoor bouldering, outdoor sport, and hangboard sessions.

### Phase 2: Semantic Dialect MVP

- Implement `ClimbDialect` under `src/dialects/`.
- Recognize common climbing grades and send types from `Action`, `Effort`, `Text`, and `Quantity` metrics.
- Emit `domain.climb`, discipline hints, grade metrics, send metrics, and attempt metrics.
- Register `climb` in editor autocomplete/fence recognition.
- Add unit tests for grade detection, send type aliases, attempt counts, and ambiguity handling.

### Phase 3: Review and Analytics

- Add climbing columns to review grid: route, grade, send type, attempts, high point, notes.
- Add summary processors for V-sum, grade pyramid, max grade, total ascents, and session load.
- Add dashboard stories for representative climbing logs.
- Ensure processors declare `dialects: ['climb']` or explicitly include `climb` when they are shared.

### Phase 4: Portability

- Add CSV export/import for climb sessions.
- Add Strava summary generation from climb sessions.
- Document Obsidian/Dataview-compatible Markdown conventions.
- Add import mapping guidance for theCrag, 8a.nu, Redpoint, KAYA, and spreadsheet exports.

---

## 10. Acceptance Criteria

1. A `climb` fence is recognized by editor tooling and documented as a Whiteboard dialect.
2. Climbing examples remain readable as plain Markdown and parse through the shared Whiteboard parser.
3. The dialect recognizes at least V-scale, YDS, and common send types with aliases.
4. Attempt counts can be represented and extracted from common shorthand such as `@3`.
5. Session properties for location, discipline, duration, RPE, energy, conditions, and grade system are preserved.
6. Review grid can display route/problem name, grade, send type, and attempts for climb blocks.
7. Analytics can produce max grade, total ascents, V-sum, and grade pyramid for bouldering fixtures.
8. Documentation includes indoor bouldering, outdoor sport, and hangboard examples.
9. Unit tests cover grade ambiguity and do not silently convert unknown grades.
10. No existing `wod`, `log`, or `plan` examples regress.

---

## 11. Open Questions

1. Should `@3` mean attempts only inside `climb`, or should attempts require an explicit keyword such as `tries 3` to avoid collision with existing quantity semantics?
2. Should `climb` be exclusively for completed logs, or should it also support future climbing plans and project templates?
3. Should route/problem identity always use `[Action]`, or should unbracketed names be inferred when a grade is present?
4. Which grade systems are required for MVP beyond V-scale and YDS?
5. Should grade conversion tables ship as bundled data, user-editable registry data, or documentation-only guidance?
6. How should multi-pitch routes represent pitch-level grades and overall route grade?
7. Should project notes live inside repeated session blocks, generated project pages, or both?
