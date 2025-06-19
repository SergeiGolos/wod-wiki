
**Description**: Chevrotain-based parser that defines the grammar rules for workout script syntax. Transforms tokenized input into a concrete syntax tree (CST) using parsing rules.

**Original Location**: `src/core/parser/timer.parser.ts`

## Properties

*   `extends CstParser` - Inherits from Chevrotain's concrete syntax tree parser

## Grammar Fragments

*   `wodMarkdown()` - Top-level rule for parsing complete workout documents
*   `wodBlock()` - Parses individual workout statements with fragments
*   `rounds()` - Handles round notation `(3)` or `(21-15-9)`
*   `duration()` - Processes timer values `:30`, `5:00`, `1:15:00`
*   `effort()` - Parses exercise names and descriptions
*   `resistance()` - Handles weight specifications `95lb`, `@bodyweight`
*   `distance()` - Processes distance measurements `100m`, `5km`
*   `reps()` - Parses repetition counts
*   `action()` - Handles special actions `[:setup]`, `[:rest]`
*   `lap()` - Processes grouping markers `-` and `+`
*   `trend()` - Handles increment directions `^` for ascending

## Methods

*   `constructor(tokens?: IToken[])` - Initializes parser with token definitions and grammar rules
*   `performSelfAnalysis()` - Validates grammar rules for conflicts and ambiguities

## Relationships
*   **Uses**: `[[allTokens]]` for token definitions
*   **Extends**: Chevrotain `CstParser`
*   **Consumed by**: `[[MdTimerRuntime]]` for CST generation
*   **Output**: Concrete syntax tree consumed by `[[MdTimerInterpreter]]`
