# Prototype Verdict & Research Notes: Analytics Explorer Query Builder

> **Prototype File:** [`playground/src/views/analytics/PROTOTYPE_analytics_query_builder.html`](./PROTOTYPE_analytics_query_builder.html)  
> **Date:** July 26, 2026  
> **Status:** Validated & Proposed for Implementation

---

## 1. The Core Question Answered

**Question:** *How can non-technical athletes and coaches compose analytics queries intuitively in `wod-wiki` without needing to memorize cryptic Datadog-flavored WQL syntax (e.g. `sum:totalVolume{discipline:strength} by {week}.rollup(1w)`) — while preserving raw WQL efficiency for power users?*

### The Problem with Current WQL UX
1. **Cryptic Syntax Barrier**: Mandatory colons, curly braces, negated filters (`!discipline:recovery`), `by {}` clauses, and `.rollup()` method calls require developer-level syntax precision.
2. **Vocabulary Discoverability**: Non-technical users do not know which Canonical Metric Keys (`totalVolume`, `tis`, `sessionLoad`, `totalReps`, `calc.acwr`) or Tag Keys (`discipline`, `effort`, `intensity`, `note`, `origin`) exist in the store.
3. **Lack of Semantic Reassurance**: Users who write or click a query cannot easily verify if the result actually answers their real-world training question ("Is my strength volume increasing week-over-week?").

---

## 2. Tested Composition Paradigms

We created an interactive prototype ([`PROTOTYPE_analytics_query_builder.html`](./PROTOTYPE_analytics_query_builder.html)) testing 3 distinct UX models:

### Model A: Guided Natural Language / Mad-Libs Sentence Composer
- **Concept:** A fill-in-the-blanks human sentence builder:
  > *"Show me the **[Sum]** of **[Total Volume]** for **[Strength Workouts]** grouped by **[Week]** rolled up every **[1 Week]**."*
- **Pros:** Zero learning curve; 100% syntax-safe dropdowns; immediately understandable by non-technical athletes.
- **Cons:** Linear flow can be verbose for complex multi-filter queries.

### Model B: Visual Form & Pill Query Builder
- **Concept:** Structured form sections separating:
  1. **Function & Metric** (Aggregator pills + Human-labeled Canonical Metric dropdown)
  2. **Tag Filters** (Dynamic filter rows with `IS` / `NOT` toggle pills and add/remove buttons)
  3. **Grouping & Rollup** (Group-by dimension pills + Rollup period pills)
- **Pros:** Highly flexible; easy to add/remove multiple tag filters; clear visual structure.
- **Cons:** Requires slightly more UI vertical space.

### Model C: Bidirectional Hybrid Model (Recommended Architecture)
- **Concept:** A unified, single-source-of-truth query state engine with bidirectional live sync:
  - Changing controls in **Guided Question** or **Visual Builder** live-compiles to canonical WQL syntax.
  - Typing or pasting raw WQL in the **Raw Editor** parses into the AST in real-time, instantly updating the Visual Form controls and generating a **Human English Translation Banner**.
- **Pros:** Best of all worlds — onboarding beginners with zero friction while empowering coaches and power users with fast raw WQL typing.

---

## 3. Comparative Evaluation Matrix

| Metric / Dimension | Raw WQL String (Current) | Guided Sentence Builder | Visual Form / Pills | Bidirectional Hybrid (Proposed) |
|---|---|---|---|---|
| **Target Audience** | Developers / Analysts | Beginners / Athletes | Coaches / Regular Users | **All Personas** |
| **Learning Curve** | High (Syntax rules) | **Zero (Natural English)** | Low (Self-explanatory) | **Progressive (Adapts to user)** |
| **Syntax Error Rate** | High (Typo-prone) | **0% (Dropdowns)** | **0% (Structured pills)** | **0% (Validated AST + Live Parser)** |
| **Discoverability** | Low (Requires docs/sidebar) | High (Human labels) | High (Category lists) | **Maximum (Interactive UI)** |
| **Power & Speed** | High for experts | Medium | High | **Maximum** |
| **Recommendation** | Keep in Dual View | Great default mode | Primary visual editor | **★ WINNING ARCHITECTURE** |

---

## 4. Key UX Findings & Design Decisions

1. **Human Label Mapping to Canonical Metric Keys**:
   - `totalVolume` ➔ **Total Weight Volume (kg / lbs)**
   - `tis` ➔ **Time-in-Motion (seconds)**
   - `sessionLoad` ➔ **Session Load Strain (RPE × Duration)**
   - `totalReps` ➔ **Total Repetitions**
   - `calc.acwr` ➔ **Acute-to-Chronic Workload Ratio (Injury Risk)**

2. **Live "Human English Translation" Banner**:
   - Placed directly above the chart/results preview.
   - Example: *WQL:* `sum:totalVolume{discipline:strength} by {week}.rollup(1w)`  
     *Translation:* ➔ *"Calculating total sum of volume (weight moved) for workouts where discipline is 'strength' grouped by week into 1w rollup windows."*

3. **One-Click Presets Gallery**:
   - Non-technical users benefit immensely from question-driven presets (e.g. *"Is strength volume rising?"*, *"Where do my reps go?"*, *"Am I spiking workload?"*).

---

## 5. Implementation Roadmap for Production (`src/` / `playground/src/`)

1. **Extract AST State Hook (`useQueryComposerState`)**:
   - Create a reusable hook wrapping `parseQuery` and `serializeQuery` from `@/services/analytics/query/wql`.
2. **Build `<WqlVisualComposer />` Component**:
   - Implement the visual pill & form builder in `src/components/organisms/analytics/WqlVisualComposer.tsx`.
3. **Build `<WqlHumanTranslationBanner />` Component**:
   - Implement plain-English query translation in `src/components/molecules/analytics/WqlHumanTranslationBanner.tsx`.
4. **Integrate into `AnalyticsExplorerPage.tsx`**:
   - Add a toggle button in `AnalyticsExplorerPage.tsx` to switch between **Visual Builder Mode**, **Guided Question Mode**, and **Raw WQL Mode**.
