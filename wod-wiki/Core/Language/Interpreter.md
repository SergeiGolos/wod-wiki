 Visitor pattern implementation that transforms the concrete syntax tree (CST) into an abstract syntax tree (AST) with typed fragments and statements. Handles hierarchy construction and metadata extraction.

**Original Location**: `src/core/parser/timer.visitor.ts`

## Properties

*   `extends BaseCstVisitor` - Inherits from Chevrotain's visitor base class

## Visitor Methods

*   `wodMarkdown(ctx: any): ICodeStatement[]` - Processes complete workout document and builds statement hierarchy
*   `wodBlock(ctx: any): ICodeStatement` - Creates individual statements with fragment collections
*   `rounds(ctx: any): CodeFragment[]` - Transforms round notation into `RoundsFragment` and `RepFragment`
*   `duration(ctx: any): TimerFragment[]` - Creates timer fragments from duration tokens
*   `effort(ctx: any): EffortFragment[]` - Generates exercise description fragments
*   `resistance(ctx: any): ResistanceFragment[]` - Creates weight specification fragments
*   `distance(ctx: any): DistanceFragment[]` - Generates distance measurement fragments
*   `reps(ctx: any): RepFragment[]` - Creates repetition count fragments
*   `action(ctx: any): ActionFragment[]` - Transforms special actions into fragments
*   `lap(ctx: any): LapFragment[]` - Creates grouping relationship fragments
*   `trend(ctx: any): IncrementFragment[]` - Generates increment direction fragments

## Utility Methods

*   `getMeta(tokens: any[])` - Extracts source location metadata from tokens
*   `combineMeta(meta: any[])` - Merges metadata from multiple fragments
*   `validateVisitor()` - Ensures all grammar rules have corresponding visitor methods

## Hierarchy Construction

The visitor builds parent-child relationships between statements:
- Uses column-based indentation to determine nesting
- Maintains execution stack for proper hierarchy
- Sets `parent` and `children` properties on statements
- Adds default `LapFragment` for child statements

## Relationships
*   **Extends**: Chevrotain `BaseCstVisitor`
*   **Processes**: CST from `[[MdTimerParse]]`
*   **Creates**: `[[ICodeStatement]]` with `[[CodeFragment]]` collections
*   **Used by**: `[[MdTimerRuntime]]` for AST generation
