# Research: Incremental Running Totals for Workout-Scope Summaries (#847)

**Scope:** evaluate strategies for maintaining running workout totals (e.g. total volume, TIS) as each segment is entered, while also supporting post-hoc replay of stored logs with identical results. Scale is personal-journal: tens of segments per workout, thousands of workouts; correctness, determinism, and simplicity dominate raw performance.

---

## 1. Incremental aggregate maintenance: classic online/streaming algorithms

### 1.1 What is available

| Statistic | Exact online algorithm | Stable? | Notes |
|---|---|---|---|
| Sum / count | Running accumulator | Yes, but plain `sum += x` can accumulate round-off over many values | Kahan / compensated summation fixes it at low cost. |
| Mean | Running mean: `mean_n = mean_{n-1} + (x_n - mean_{n-1}) / n` | Yes | Welford's update; avoids large intermediate totals. |
| Variance / std. dev. | Welford's online algorithm; also West (1979) weighted variant | Yes | Maintains `M2 = Σ(x_i - mean)^2` incrementally, avoiding catastrophic cancellation of `Σx^2 - (Σx)^2/n`. |
| Min / max | Running tracker | Exact | Deletions are hard (need a window/priority structure); for append-only streams it is trivial. |
| Quantiles / median | t-digest, Greenwald-Khanna, P² | Approximate | t-digest gives high accuracy near distribution tails with bounded memory; only needed if you actually need percentiles. |

### 1.2 Welford's algorithm

The standard reference is Welford (1962), "Note on a Method for Calculating Corrected Sums of Squares and Products", *Technometrics* 4(3), 419–420. DOI: [10.2307/1266577](https://doi.org/10.2307/1266577). For each new sample `x_n`:

```
delta  = x_n - mean_{n-1}
mean_n = mean_{n-1} + delta / n
M2_n   = M2_{n-1} + delta * (x_n - mean_n)
var_n  = M2_n / (n - 1)   # sample variance
```

This is numerically stable because it accumulates deviations from the running mean rather than subtracting two large, nearly equal sums of squares. Wikipedia's "Algorithms for calculating variance" article gives a clean modern exposition with the same recurrence: https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm.

### 1.3 West (1979) — weighted / improved incremental variance

West, D. H. D. (1979), "Updating Mean and Variance Estimates: An Improved Method", *Communications of the ACM* 22(9), 532–535. DOI: [10.1145/358746.358758](https://doi.org/10.1145/358746.358758). West's form is especially useful for weighted updates and is the ancestor of most robust one-pass variance implementations used in statistical libraries. It keeps the accumulated quantities on the same scale as the data, which limits round-off growth.

### 1.4 t-digest for streaming quantiles

If the engine ever needs approximate percentiles (e.g. 95th percentile RPE across a workout), Dunning & Ertl's t-digest is the usual industrial choice: Dunning, T. & Ertl, O. (2019), "Computing Extremely Accurate Quantiles Using t-Digests", arXiv:1902.04023. https://arxiv.org/abs/1902.04023. It maintains a compact sketch of centroids, gives high accuracy in the tails, and supports merging sketches. For the current use case it is not required unless percentiles become a first-class summary.

### 1.5 Does numerical stability matter at this scale?

Probably not for plain sums of tens of segments, but it can matter for variance, standard deviation, and for composites that subtract large, similar values (e.g. normalized scores). The cost of using Welford or a simple compensated sum is negligible, so it is reasonable defensive engineering. At personal-journal scale, the bigger risk is not floating-point overflow but **incremental drift** from maintaining a non-associative formula step-by-step.

---

## 2. Recomputation vs. incremental update: when does incrementalization pay?

### 2.1 The stream-processing view

Apache Flink and Apache Spark Structured Streaming both support incremental aggregation, but they do it primarily to bound **state** and **memory**, not because recomputation is inherently wrong.

* Flink's `AggregateFunction` keeps a small accumulator (e.g. a running sum/count tuple) instead of buffering every element in a window. Docs: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/#window-functions.
* Spark Structured Streaming stores intermediate state in a `StateStore` across micro-batches and applies deltas. Docs: https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html.

Both systems choose incrementalization when:

1. Windows/key-groups are large or unbounded.
2. Recomputing the entire window on every batch would be expensive or memory-intensive.
3. State must be checkpointed and recovered efficiently.

### 2.2 The personal-journal math

For wod-wiki, the relevant numbers are small:

* ~30 segments per workout.
* A handful of summary values per segment (volume, TIS, etc.).
* Recomputing a workout total from scratch after each segment is at most `O(n²)` with `n ≈ 30`, i.e. ~900 primitive operations per workout.

At this scale, recomputation is trivially fast. The trade-off therefore flips: incrementalization buys no meaningful performance and adds code paths, state, and drift risk.

### 2.3 Materialized-view maintenance literature

Database incremental view maintenance (IVM) makes a similar distinction. The PostgreSQL manual states that materialized views trade freshness for query speed and require explicit `REFRESH`: https://www.postgresql.org/docs/current/rules-materializedviews.html. Surveys of IVM classify aggregates by whether they are **self-maintainable** and **invertible**: sums and counts are easy; `MIN`/`MAX` are not, because removing a value may require re-scanning the base data to find the new extremum. PostgreSQL's `pg_ivm` extension follows this taxonomy. For non-invertible or composite functions the literature typically recommends either (a) storing enough extra state to re-derive the result, or (b) falling back to recomputation. At small scale, recomputation is the simpler fallback.

---

## 3. Non-additive composites: TIS and similar formulas

### 3.1 Why TIS is not a simple fold

A composite such as TIS (a weighted combination of MET-score, RPE-score, duration-score, and discipline-factor) may not be purely additive because:

* Some inputs depend on **global averages** or other workout-wide statistics (e.g. normalizing by the mean duration across all segments).
* Some inputs depend on **last-seen lookup values** (e.g. the discipline factor is taken from the most recent segment with a given discipline).
* Weights may be non-constant across segments.

A fold is a function `f(acc, x)` where the accumulator alone is sufficient. If the formula needs the full history or a global statistic, it is not foldable in the strict sense.

### 3.2 Strategies

1. **Recompute from the full segment list.** Evaluate the whole workout from segment 1..n after every edit. This automatically handles global averages, last-seen lookups, and arbitrary weighting. Live and replay use the same function.
2. **Maintain sufficient statistics.** Store `sum(x)`, `count`, `last_value_by_key`, and any other needed partial results, then derive the composite. This is the approach used in materialized-view maintenance for self-maintainable aggregates. It works for global averages but still requires re-deriving the final formula, and the set of required statistics can grow with formula complexity.
3. **Hybrid: maintain a cached aggregate and invalidate it.** Keep the last computed value but recompute from scratch when a segment changes. This is effectively lazy recomputation and avoids incremental drift.

At personal-journal scale, strategy 1 is the clear winner unless there is a later requirement to process very large streams or very frequent live updates.

---

## 4. Replay determinism: what streaming systems require

### 4.1 Event time and watermarks

Apache Flink's time documentation explains the foundation: use **event time** (the timestamp embedded in the record) rather than **processing time** (wall clock), and use **watermarks** to signal that all events up to a given timestamp have arrived. https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/.

Key consequences:

* Processing time is non-deterministic because it depends on arrival delays and system clock.
* Event time is deterministic *if* the same records are replayed in the same order and the same watermark strategy is used.
* Watermarks control when a window is closed and late records are handled; changing the watermark strategy changes the output, so it must be part of the reproducible engine configuration.

The same concepts are described in the original Dataflow Model paper: Akidau, T. et al. (2015), "The Dataflow Model", *Proc. VLDB Endow.* 8(12), 1792–1803. DOI: [10.14778/2824032.2824076](https://doi.org/10.14778/2824032.2824076). It defines the `event_time`/`processing_time` distinction and the role of watermarks in balancing correctness, latency, and cost.

### 4.2 Invariants for replay-identical results

For any engine, live and replay produce the same output when:

1. **Inputs are ordered identically.** The segment sequence must be stable and deterministic. If edits can insert or reorder segments, the engine must define a canonical order (e.g. by creation timestamp, then by segment index).
2. **Functions are pure.** No processing-time, randomness, or external state that differs between live and replay.
3. **State updates are idempotent.** Replaying the same segment twice with the same inputs yields the same internal state.
4. **Late/out-of-order handling is fixed.** If segments can be inserted retroactively, the engine must decide whether to re-evaluate the whole workout or apply a deterministic update rule.

For wod-wiki, the simplest invariant is: **the canonical state of a workout is the ordered list of its segments plus a deterministic pure function from that list to the summary values.** Live entry and replay both invoke the same function.

---

## 5. Recommendation

**Use full recomputation from the stored segment list as the default strategy.** Maintain a small, deterministic pure function `workoutSummary(segments) -> totals` and invoke it after every segment change. Do not build incremental streaming state for workout-level summaries unless a future benchmark proves it is necessary.

### Why this fits the constraints

* **Correctness:** A pure recomputation has no incremental drift, no special cases for non-additive composites, and no ordering ambiguities. TIS and other formulas that depend on global averages or last-seen lookups work automatically.
* **Determinism:** The same ordered segment list always yields the same totals. Live entry and stored-log replay use the same code path, so replay-identical results fall out of the design.
* **Simplicity:** One summary function, one test suite, one set of debugging tools. No separate "live" and "replay" accumulators to keep synchronized.
* **Performance:** With tens of segments per workout, the cost is negligible. Even pathological cases (thousands of segments) remain trivial on modern hardware compared with the rest of the UI work.
* **Extensibility:** When a new composite is added, the implementer only writes a new function over the segment list; there is no accumulator schema to migrate.

### What to keep from the streaming literature

Borrow the *ideas* but not the machinery:

* Use **event time / segment order** as the logical clock, not wall clock or insertion time.
* Treat the segment list as the source of truth; computed summaries are **derived views**.
* If a later feature genuinely needs approximate quantiles (e.g. percentile RPE), adopt t-digest then; do not add it speculatively.
* For variance or standard-deviation summaries, use **Welford's algorithm** inside the pure summary function as a defensive stability measure. It is a small addition and protects against catastrophic cancellation if composite scores ever subtract large, similar numbers.

### Suggested implementation shape

```ts
type SegmentSummary = {
  segmentId: string;
  volume: number;
  metScore: number;
  rpeScore: number;
  durationScore: number;
  disciplineFactor: number;
};

function workoutSummary(segments: SegmentSummary[]) {
  const totalVolume = segments.reduce((s, x) => s + x.volume, 0);
  // TIS and other composites can read the full segments array,
  // compute global averages, last-seen lookups, etc.
  const tis = computeTis(segments);
  return { totalVolume, tis };
}
```

When a segment is added or edited, re-run `workoutSummary(currentSegments)` and replace the displayed values. For replay, run the same function over the stored segment list. This gives the exact same result with the minimum conceptual surface area.

---

## Sources

* Welford, B. P. (1962). "Note on a Method for Calculating Corrected Sums of Squares and Products." *Technometrics* 4(3), 419–420. https://doi.org/10.2307/1266577
* West, D. H. D. (1979). "Updating Mean and Variance Estimates: An Improved Method." *Communications of the ACM* 22(9), 532–535. https://doi.org/10.1145/358746.358758
* Dunning, T. & Ertl, O. (2019). "Computing Extremely Accurate Quantiles Using t-Digests." arXiv:1902.04023. https://arxiv.org/abs/1902.04023
* Akidau, T. et al. (2015). "The Dataflow Model: A Practical Approach for Balancing Correctness, Latency, and Cost in Massive-Scale, Unbounded, Out-of-Order Data Processing." *Proc. VLDB Endow.* 8(12), 1792–1803. https://doi.org/10.14778/2824032.2824076
* "Algorithms for calculating variance." Wikipedia. https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance
* Apache Flink, "Timely Stream Processing" (event time & watermarks). https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/
* Apache Flink, "Windows" (window functions & incremental aggregation). https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/
* Apache Spark, "Structured Streaming Programming Guide." https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html
* PostgreSQL, "Materialized Views." https://www.postgresql.org/docs/current/rules-materializedviews.html
