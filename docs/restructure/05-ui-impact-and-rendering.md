# UI Impact & Rendering: The Fragment View Model

The transition to a Fragment-Centric architecture fundamentally changes how the UI consumes and displays workout data. We move from **Type-Specific Views** to **Generic Fragment Renderers**, drastically reducing the lines of code needed to support new workout modes.

## 1. The Core UI Principle: "Render the Bucket"

The UI no longer asks "Is this an AMRAP?" Instead, it asks **"What fragments are in this bucket?"**

- **Goal**: Eliminate complex `switch(blockType)` statements in React/UI components.
- **Re-use**: A single `TimerFragment` component can be used by CrossFit, Yoga, and Powerlifting dialects without modification.

## 2. From Block-Based to Fragment-Based Rendering

### The Old Way (Type-Specific)
```tsx
// ❌ Complexity: Hardcoded logic for every block type
function BlockView({ block }) {
  if (block.type === 'AMRAP') return <AmrapView timer={block.timer} rounds={block.rounds} />;
  if (block.type === 'EMOM') return <EmomView timer={block.timer} interval={block.interval} />;
  // ... repeat for every new sport
}
```

### The New Way (Fragment-Driven)
```tsx
// ✅ Simplicity: Render whatever is in the bucket
function BlockView({ block }) {
  return (
    <div className="fragment-stack">
      {block.fragments.map(fragment => (
        <FragmentRenderer key={fragment.id} fragment={fragment} />
      ))}
    </div>
  );
}

function FragmentRenderer({ fragment }) {
  // Map fragmentType to a small, reusable component
  const Component = Registry.get(fragment.fragmentType);
  return <Component value={fragment.value} behavior={fragment.behavior} />;
}
```

## 3. Impact on Key UI Areas

### A. The Execution Stack (Live View)
- **Dynamic Layout**: The stack automatically grows or shrinks based on the fragments active in the block.
- **Live Updates**: Because the UI observes the "Projected Snapshot," the big clock and the round counter are updated via the same mechanism.

### B. The Review Grid (Analytics)
- **Automatic Columns**: The grid can "discover" its columns by looking at the set of `fragmentTypes` in the output statements.
- **Zero-Config Reporting**: If a new dialect adds a `HeartRateFragment`, it automatically appears in a new column in the Review grid without any UI changes.

## 4. Mental Model for Developers

1. **Define a Fragment**: What data do I want to show? (e.g., `BreathCount`)
2. **Create a Renderer**: How does `BreathCount` look? (e.g., a simple number with an icon)
3. **The System Does the Rest**: The compiler adds the fragment, the engine updates it, and the UI automatically renders it.

## 5. Summary of Benefits

- **Fewer Lines of Code**: No more duplicating display logic for "Intervals" vs "AMRAPs."
- **High Re-use**: Fragments like `Duration` and `Label` are used by 100% of workout types.
- **Easy to Understand**: The UI is a direct, predictable mirror of the data in the block.
