# Storage V4 Overhaul Plan: Multi-Source Data Lens

This document outlines the architectural plan for transitioning the WOD Wiki storage layer to **Version 4**. This update prioritizes modularity, versioning, and a de-normalized analytics model to support external data sources (HR/GPS) and cross-workout trend analysis.

---

## 1. System Context (C4 Level 1)
The application is evolving from a single-stream execution log to a **Multi-Source Data Platform**.
- **Input**: Versioned Note Segments (WOD Scripts, YouTube, Markdown).
- **Execution**: Ground-truth recording of performance (Results).
- **External**: Temporal data buckets attached to the workout (HR/GPS Blobs).
- **Analysis**: A "Lens" (Analytics Engine) that joins these sources into a searchable, de-normalized set of metrics.

---

## 2. Container: IndexedDB Schema V4 (C4 Level 2)

### "Fresh Start" Strategy
Since the application is in active development and not yet live, we will implement a **destructive upgrade**. If the existing database version is `< 4`, the `IndexedDBService` will delete all existing object stores and recreate them using the V4 schema.

### V4 Object Stores

| Store | Key | Primary Indexes | Purpose |
| :--- | :--- | :--- | :--- |
| **`notes`** | `id` | `by-target-date` | Root container and sorting metadata. |
| **`segments`** | `[id, version]` | `by-note`, `by-type` | Versioned content (YouTube, Scripts, MD). |
| **`results`** | `id` | `by-segment`, `by-note` | Raw execution stream (IOutputStatement[]). |
| **`attachments`**| `id` | `by-note`, `by-time` | Temporal blobs (GPS/HR data). |
| **`analytics`** | `id` | `by-type`, `by-segment`, `by-result` | **De-normalized** metric data points. |

---

## 3. Component: Service Logic (C4 Level 3)

### A. Segment Versioning
The `IndexedDBContentProvider` will no longer store a single script per note. Instead:
- Notes will contain an ordered list of `segmentId`s.
- Each `segmentId` points to the latest version in the `segments` store.
- When a segment is edited, a new version is created, preserving the history of what was actually executed in past workouts.

### B. De-normalized Analytics
The `AnalyticsEngine` will shift from producing summary `OutputStatements` to producing flat `AnalyticsDataPoint` records. This allows the UI to query specific metrics (e.g., "Max HR") across multiple workouts without loading the full execution logs.

---

## 4. Code Implementation (C4 Level 4)

### Step 1: Update Interfaces (`src/types/storage.ts`)

```typescript
export interface NoteSegment {
    id: string;           // Stable UUID across versions
    version: number;      // 1, 2, 3...
    noteId: string;
    dataType: 'script' | 'youtube' | 'markdown' | 'header' | 'frontmatter';
    data: any;            // JSON or Blob data
    rawContent: string;   // Original markdown source
    createdAt: number;
}

export interface AnalyticsDataPoint {
    id: string;
    noteId: string;
    segmentId: string;
    segmentVersion: number;
    resultId: string;     // Link to raw WorkoutResult
    
    metricType: string;   // 'total_reps', 'avg_hr', 'pace'
    value: number | any;
    unit?: string;
    label: string;        // "Average Heart Rate"
    
    timestamp: number;    // Effective workout date
    createdAt: number;    // Generation date
}
```

### Step 2: Database Re-initialization (`src/services/db/IndexedDBService.ts`)

```typescript
// Inside openDB upgrade callback
if (oldVersion < 4) {
    // Delete all legacy stores
    db.objectStoreNames.forEach(s => db.deleteObjectStore(s));

    // Create V4 structure
    db.createObjectStore('notes', { keyPath: 'id' });
    const segments = db.createObjectStore('segments', { keyPath: ['id', 'version'] });
    segments.createIndex('by-note', 'noteId');

    const analytics = db.createObjectStore('analytics', { keyPath: 'id' });
    analytics.createIndex('by-type', 'metricType');
    analytics.createIndex('by-segment', 'segmentId');
    analytics.createIndex('by-result', 'resultId');
}
```

### Step 3: Analytics Finalization Refactor
Each process (e.g., `RepAnalyticsProcess`) will implement a `finalize()` method that returns a collection of `AnalyticsDataPoint` objects instead of a single statement.

---

## 5. UI Integration Strategy
- **Review Grid**: Loads `WorkoutResult` (raw timeline) + `Analytics` (derived metrics) for the current `resultId`.
- **Charts**: Can now query the `analytics` store directly using `by-type` to show progress over time for specific movements or metrics.
- **Attachments**: The UI will query the `attachments` store using the `timeSpan` of the selected `WorkoutResult` to overlay GPS maps or HR graphs.
