# Folding Logic Refactor Walkthrough

The monolithic `RichMarkdownManager` has been refactored into a modular feature-based system.

## Architecture

*   **`RichFeature` Interface**: Defines the contract for all folding/hiding features.
*   **`FeatureRegistry`**: Manages active features and orchestrates the update cycle.
*   **Feature Classes**:
    *   `FrontMatterFeature`: Handles YAML front matter.
    *   `MediaFeature`: Handles Images and YouTube links.
    *   `WodBlockFeature`: Handles ` ```wod ` fences.
    *   `HeadingFeature`: Handles `# Heading` syntax hiding.
    *   `BlockquoteFeature`: Handles `> Quote` syntax hiding.

## Verification Steps

1.  **Front Matter**:
    *   Open a file with YAML front matter.
    *   Verify it is folded into a table.
    *   Click "Edit" to verify it unhides.

2.  **Media**:
    *   Add an image `![alt](url)` on a new line.
    *   Verify it renders the image widget.
    *   Move cursor to the line to verify it unhides (if not read-only).

3.  **Wod Blocks**:
    *   Add a ` ```wod ` block.
    *   Verify the fence lines are hidden/collapsed.

4.  **Headings**:
    *   Add a heading `# Test`.
    *   Verify the `# ` is hidden and text is styled.
    *   Move cursor to the line to verify `# ` appears.

5.  **Blockquotes**:
    *   Add a quote `> Test`.
    *   Verify the `> ` is hidden and text is styled.
    *   Move cursor to the line to verify `> ` appears.

## Debugging

Each feature has a `debugName`. You can enable logging in `FeatureRegistry.ts` to see which features are processing ranges.
