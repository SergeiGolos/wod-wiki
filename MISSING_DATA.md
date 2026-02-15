# Missing Data Attributes

As requested, this document identifies potential missing data attributes in the current `HistoryEntry` data model relative to a fully featured WOD tracking system, along with how they are handled in the current implementation.

## Currently Implemented

- **Name**: Mapped to `entry.title`.
- **Dates**:
  - **Created**: `entry.createdAt`
  - **Target**: `entry.targetDate`
  - **Last Update**: `entry.updatedAt`
- **Tags**: `entry.tags` (Array of strings).
- **Clone Source**: `entry.templateId`.

## Missing / Placeholder Elements

The following data fields do not have dedicated columns in the `HistoryEntry` database schema but might be desirable for a richer experience. In the current UI, these are either missing or derived from raw content.

1.  **Dedicated Description / Notes Field**
    -   **Status**: The `notes` field exists on `HistoryEntry` but is often empty if not explicitly set.
    -   **Handling**: A placeholder alert ("Missing Data") is displayed in the Details panel if `entry.notes` is empty.

2.  **Explicit Workout Type (e.g., AMRAP, RFT, EMOM)**
    -   **Status**: Currently derived by parsing the `rawContent` or inferred from `tags`. No dedicated database column.
    -   **Handling**: Not displayed in the Details panel metadata; users must rely on the WOD content itself.

3.  **Duration / Time Cap**
    -   **Status**: Parsed from content (e.g., `Timeout: 20 min`), not stored as a top-level metadata field.
    -   **Handling**: Displayed in the editor/content view but not in the metadata sidebar.

4.  **Scoring Metric**
    -   **Status**: Implicit in the content.
    -   **Handling**: No efficient way to filter/sort by "Score Type" without parsing content.

## Recommendation

For future updates, consider promoting "Workout Type" and "Estimated Duration" to top-level fields in `HistoryEntry` to allow for better filtering and display in the Details panel without parsing Markdown.
