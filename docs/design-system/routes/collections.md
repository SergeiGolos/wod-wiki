# Route: `/collections`

| | |
|--|--|
| **Route Pattern** | `/collections`, `/collections/:slug` |
| **Templates** | [Canvas Page](../templates/canvas.md) (per slug), [Queriable List](../templates/queriable-list.md) (index) |
| **Source File** | `markdown/collections/{slug}/README.md` or dynamically from `workoutFiles` |

## Page Outline

The collections route has two primary modes depending on the presence of a slug.

### 1. Collection Browser (Index)
The root `/collections` route uses the [Queriable List](../templates/queriable-list.md) template. It provides a hierarchical view of all available workout categories (CrossFit, Kettlebell, Swimming, etc.) allowing for global search and bulk browsing.

### 2. Collection Hub (per Slug)
Specific collection routes (e.g., `/collections/dan-john`) use the [Canvas Page](../templates/canvas.md) template. These are automatically generated based on the folder structure in `markdown/collections/`.

### Automatic Routing
Unlike other Canvas pages, collections do not require a `route:` key in their frontmatter. The route is derived at build-time from the parent folder name.
*Example: `markdown/collections/dan-john/README.md` is served at `/collections/dan-john`.*

### Collection Workouts List (TSX Automatic)
At the bottom of every collection page, `CanvasPage.tsx` automatically renders a **"Collection Workouts"** section. This section lists all individual markdown files found within the collection's directory (excluding the `README.md`).
- **Logic**: `isCollection && workoutItems.filter(item => item.category === slug)`
- **Interaction**: Clicking a workout item triggers the `onSelect` callback, typically navigating the user to the [Workout Editor](./workout.md).

## Sections Outline

While individual collections vary, a standard `README.md` for a collection follows this structure:

| Section | Content |
|---------|---------|
| **Collection Header** | `# Title`, Category, Philosophy, and Author info. |
| **Overview** | General introduction to the training style or methodology. |
| **Workout Sections** | `## Workout Name` headings containing a description, a `wod` block, and sometimes a summary table (Breakdown, Standards, Metrics). |

*Note: Most collection READMEs currently use a "Full-width" Canvas layout (no `view` block), providing a rich, single-column reading experience.*

## Special Actions & Pipelines

Collections primarily use standard markdown links or specialized `wod:` and `file:` links to navigate between workouts.

### Workout Loading
Since collection READMEs often contain multiple `wod` blocks, they act as a catalog. Users can:
1. **Read** the workout description and script inline.
2. **Scroll** to the bottom to see the "Collection Workouts" list.
3. **Navigate** to an individual workout page for full-screen tracking.

### Link Patterns
- `[Label](wod:path/to/workout)`: Deep link to a specific workout script.
- `[Label](file:path/to/file)`: Link to a supplemental file (e.g., GPX/TCX for swimming/running).

## Active Collections

| Slug | Methodology |
|------|-------------|
| `dan-john` | Kettlebell strength & simplicity. |
| `geoff-neupert` | Kettlebell complexes and "Easy Muscle". |
| `crossfit-girls` | Classic CrossFit "Girl" benchmarks. |
| `swimming-*` | Specialized swim programming (7 categories). |
| `syntax` | Interactive examples of every WodScript feature. |
