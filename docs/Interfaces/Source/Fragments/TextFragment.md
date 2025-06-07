# TextFragment Interface Documentation

## Description
Represents a text fragment (e.g., comments, labels) parsed from a workout script. Used for non-executable, descriptive, or label content in statements.

## Original Location
`src/core/fragments/TextFragment.ts`

## Properties
- `text: string` — The text content
- `level?: string` — Optional text level (e.g., heading)
- `type: string = "text"`
- `fragmentType: FragmentType.Text`
- `meta?: CodeMetadata`

## Usage
Used in: [[JitStatement]], [[CodeStatement]] for descriptive or label content.

## Relationships
- Implements: [[CodeFragment]]
- Used by: [[FragmentCompilationManager]], [[IFragmentCompilationStrategy]]
