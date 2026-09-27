Status: resolved
# Frontmatter Editor Typeahead and Tag Creation

Type: task
Blocked by: 01, 02

## Question

How should `FrontmatterCompanion.tsx` detect properties matching tag types, render typeahead chip inputs, and support creating fresh tags?

Implementation details to deliver:
1. Tag type detection: subscribe or fetch registered tag types in `FrontmatterCompanion.tsx`.
2. Dedicated typed-tag property control: when a frontmatter property key matches a known tag type, render a multi-chip input (similar to list property).
3. Typeahead suggestions: as the user types in the chip input, show matching existing tags of that type.
4. On-the-fly creation: pressing Enter or comma with a new label creates the tag in the `tags` store with `type: matchingTypeName` and adds it to the list.
5. Unit/integration tests or storybook fixture for the typed tag editor component.

## Answer

Resolved by implementation:
1. In `FrontmatterCompanion.tsx`, tag types and their associated tags are fetched from `storageService`.
2. When a frontmatter property key matches a known tag type (case-insensitive), it is rendered as a list-of-chips property editor.
3. As the user enters text in the chip draft input, a typeahead listbox popup appears suggesting existing tags of that type matching the prefix.
4. Pressing Enter/comma or clicking a suggestion / "Create tag" option creates unseen tags on-the-fly in `storageService.putTag` with `type: matchingTagType.name` and adds them to the list.
5. Tested with automated unit test suite in `FrontmatterCompanion.typedTags.test.tsx`.
