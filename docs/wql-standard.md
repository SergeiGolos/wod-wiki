# Wod Query Language (WQL) Standard

This document is the canonical reference for WQL — the unified query language driving both analytics aggregations and content discovery across the application. It acts as the contract between the frontend composer UI, the query grammar, and the backend execution engines.

## 1. Core Principles

- **One Language, Multiple Stores:** Users learn a single syntax. Whether aggregating numeric facts or searching markdown notes, the vocabulary (metrics, dimensions, tags) and structure remain consistent.
- **Strict on Structure, Lenient on Data:** The parser enforces valid syntax, known operators, and canonical structural keys. It does *not* strictly validate tag values (e.g., custom `effort` slugs), ensuring user-generated data remains queryable.
- **Calm by Default:** The language is designed to map cleanly back to plain English sentences (Guided Question mode) while progressively disclosing raw WQL code for power users.

## 2. Analytics WQL (The established syntax)

Analytics queries execute against the derived fact store (`AnalyticsDataPoint` rows) via the 4-stage `QueryService` plan (SELECT → BUCKET → AGGREGATE → GROUP).

**Shape:**
```wql
<aggregator>:<metric>{<filters>} by {<dimension>}.rollup(<period>)
```

**Examples:**
- `sum:totalVolume{discipline:strength} by {week}.rollup(1w)`
- `avg:calc.acwr{effort:back-squat}`
- `count:totalReps{intensity:z4-z5 (hard)} by {month}.rollup(4w)`

### 2.1 Analytics Components

*   **Aggregator (`agg`):** Defines the math applied to the buckets.
    *   *Supported:* `sum`, `avg`, `min`, `max`, `count`, `last`, `delta`.
*   **Metric (`metric`):** The numeric field being aggregated.
    *   *Supported Base:* `sessionLoad`, `tis`, `totalReps`, `totalVolume`, `totalDistance`, `metMinutes`, `elapsed`, `pace`, `power`.
    *   *Supported Calculated:* `calc.acwr`, `calc.monotony`, `calc.strain`.
*   **Filters (`filters`):** Key-value pairs narrowing the dataset.
    *   *Syntax:* `key:value` (e.g., `effort:thruster`).
    *   *Negation:* `-key:value` (e.g., `-discipline:recovery`).
    *   *Wildcards/OR:* Pipes (`|`) and asterisks (`*`) supported in values.
*   **Dimension (`dimension`):** The grouping key.
    *   *Supported:* Time-based (`day`, `week`, `month`, `year`) or metadata (`effort`, `discipline`, `intensity`).
*   **Rollup (`period`):** The window size for bucketing (e.g., `1d`, `1w`, `4w`).

## 3. Content WQL (The `find:` extension)

Content queries execute against the user's IndexedDB journal (`INotePersistence`) and the preloaded Catalog corpus (`collections`, `feeds`).

**Shape:**
```wql
find:<target>{<filters>} [where <cross_store_predicate>] [in <scope>] [last <n>w]
```

**Examples:**
- `find:note{effort:thruster} in journal last 8w`
- `find:block{type:dashboard} in collections`
- `find:block{text:fran} in all last 52w`
- `find:note{!source:feed} in all`

### 3.1 Content Components

*   **Target (`target`):** What the query returns.
    *   `note`: Returns whole markdown notes (journal Notes, Catalog Sessions, Catalog Posts).
    *   `block`: Returns addressable subsets of notes (fenced regions like ````time```, ````dashboard```, ````query```, headings).
*   **Filters (`filters`):** Reuses the analytics tag vocabulary, plus content-specific keys:
    *   `type`: Fenced block type (e.g., `wod`, `dashboard`, `query`, `heading`).
    *   `has`: Checks for presence of elements (e.g., `timer`, `image`).
    *   `text`: Substring match over raw note/block content.
    *   `source`: Fine-grained content source filtering (`journal`, `collection`, `feed`, or catalog ID like `collection:crossfit-girls`). Negation (`!source:feed`) excludes that source.
*   **Scope (`scope`):** Primary search space.
    *   `journal`: IndexedDB user notes.
    *   `collections`: Curated preloaded Catalog sessions.
    *   `feeds`: Dated Catalog posts.
    *   `all`: Universal search across all sources.
*   **Time Window (`last <n>w|d`):** Filters by note or post date. (Note: standard Catalog sessions are undated).

## 4. Cross-Store Queries

Bridging the content and analytics gap, WQL supports joining note/block content with numeric thresholds from the analytics engine via the `where` clause.

**Syntax:**
```wql
find:note{tags:pr} where sum:totalVolume{} > 5000 in journal last 8w
```

**Mechanism:** The `QueryService` handles cross-store joins leveraging the deterministic `blockContentId` (FNV-1a hash) and `segmentId` keys, ensuring raw `WorkoutResult` logs remain the authoritative source of truth over disposable facts.

## 5. In-Note Query Blocks (` ```query ` and ` ```dashboard `)

WQL queries can be embedded directly inside Markdown notes as first-class fenced blocks. They render inline as live, interactive results in the note editor and prose viewer.

*   **` ```query ` Block:** Contains a single WQL string (analytics or `find:` content query).
*   **` ```dashboard ` Block:** Layout container containing one WQL query per line or structured YAML widget configurations.

## 6. Lexing and Parsing Structure

WQL is governed by a Lezer grammar (`src/grammar/wql.grammar`). 
*   **Avoiding Shadowing:** Structural tokens for content search (`find`, `in`, `last`, `where`) are implemented as parse-context keywords rather than global tokens to prevent shadowing legitimate tag values or metrics.
*   **AST Union:** `parseQuery()` returns a discriminated union (`ParsedQuery` for facts, `ParsedFindQuery` for content targets) to strongly type the downstream executor requirements.
*   **Canonical Vocabulary:** All UI composer modes (Visual Builder, Sentence, Dual View, Multi-Query) derive their dropdown options from the singular source of truth in `src/parser/wql-language.ts`.