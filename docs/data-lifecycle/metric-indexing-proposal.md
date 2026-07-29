# Proposed Database Schema: Indexed Metrics Refactor (V13)

This document outlines the proposed refactor to move workout results from an opaque JSON array (`WorkoutResult.data.logs`) into a flat, fully-indexed metrics table. This enables the `QueryService` to execute fast, native range scans for cross-store WQL queries (e.g., `find:note where sum:totalVolume{} > 5000`).

## Current vs. Proposed Data Flow

```mermaid
flowchart TD
    subgraph Current["Current State (V12)"]
        direction LR
        N1[Note Segment] -->|"block"| WR1[WorkoutResult]
        WR1 -->|"data.logs"| ARR1[(JSON Array)]
        ARR1 -.->|"Parsed in memory"| QS1[QueryService]
    end

    subgraph Proposed["Proposed State (V13)"]
        direction LR
        N2[Note Segment] -->|"block"| WR2[WorkoutResult]
        WR2 -.->|"emits atomic metrics"| FT[(Flat Metrics Table)]
        N2 -.->|"blockContentId"| FT
        FT -->|"Indexed Range Scans"| QS2[QueryService]
    end

    style ARR1 fill:#f9d0c4,stroke:#ff6b5b,stroke-width:2px
    style FT fill:#d4f9c4,stroke:#4CAF50,stroke-width:2px
```

## Proposed Schema (ERD)

The `AnalyticsDataPoint` table is expanded (or replaced by a unified `ResultMetric` table) to become the canonical store for **all** atomic metrics, not just derived summaries.

```mermaid
erDiagram
    NOTE ||--o{ NOTE_SEGMENT : "contains (versioned)"
    NOTE_SEGMENT ||--o{ WORKOUT_RESULT : "produces"
    NOTE_SEGMENT ||--o{ FLAT_METRIC : "emits atomic metrics"
    WORKOUT_RESULT ||--o{ FLAT_METRIC : "generates"

    FLAT_METRIC {
        string id PK
        string noteId FK "Indexed"
        string segmentId FK "Indexed"
        string blockContentId "Indexed (FNV-1a hash)"
        string resultId FK "Indexed"
        string metricType "e.g., reps, totalVolume"
        number value "The actual metric value"
        string effortSlug "FK to Effort catalog"
        string discipline "Indexed (strength, gymnastics...)"
        string intensityTier "Indexed (z1-z2, z4-z5...)"
        number timestamp "Indexed (canonical workout time)"
    }

    WORKOUT_RESULT {
        string id PK
        string noteId FK
        string segmentId FK
        string blockContentId "Indexed"
        string origin "journal or playground"
        number createdAt "Indexed"
    }

    NOTE_SEGMENT {
        array id_version PK "Compound Key [id, version]"
        string noteId FK
        string dataType "wod, h1, markdown..."
        json data "ScriptBlock (for wod type)"
    }
```

## New Indexes Added

To support `QueryService` executing fast `IDBKeyRange` scans without loading data into memory, we add the following indexes to the metrics table:

1. **`by-value` (Compound):** `[metricType, value]`
   - *Purpose:* Allows the database to natively find all `totalVolume` metrics `> 5000` instantly.
2. **`by-content` (Standard):** `blockContentId`
   - *Purpose:* The join key used for bi-directional cross-store queries (`find:block where ...`).

## Migration Path (V13)

1. **Backfill:** On database upgrade, iterate through all existing `WorkoutResult` records.
2. **Parse & Flatten:** Read the opaque `data.logs` JSON array. For every atomic metric found (reps, weight, time, calories), emit a new `FlatMetric` row.
3. **Index:** Apply the new `by-value` and `by-content` indexes.
4. **Cleanup (Optional):** The raw `data.logs` array can be stripped from the `WorkoutResult` record, as the UI and query engine now rely strictly on the flat metrics table for rendering and analytics.
