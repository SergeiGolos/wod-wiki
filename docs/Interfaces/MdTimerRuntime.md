# MdTimerRuntime

**Description**: Main entry point for parsing workout script text into executable runtime structures. Orchestrates the lexer, parser, and visitor to transform raw text into `WodRuntimeScript` objects.

**Original Location**: `src/core/parser/md-timer.ts`

## Properties

*   `lexer: Lexer` - Chevrotain lexer instance for tokenizing input text
*   `visitor: MdTimerInterpreter` - Visitor pattern implementation for AST creation

## Methods

*   `constructor()` - Initializes lexer with all tokens and creates visitor instance
*   `read(inputText: string): WodRuntimeScript` - Processes raw workout text through complete parsing pipeline

## Relationships
*   **Uses**: `[[Lexer]]`, `[[MdTimerInterpreter]]`, `[[MdTimerParse]]`, `[[allTokens]]`
*   **Returns**: `[[WodRuntimeScript]]` containing parsed statements
*   **Processes**: Raw workout text → Tokens → CST → AST → ICodeStatement[]

## Parsing Pipeline

1. **Lexical Analysis**: `lexer.tokenize()` breaks text into tokens
2. **Parsing**: `MdTimerParse` creates concrete syntax tree (CST)
3. **Visitor Pattern**: `MdTimerInterpreter.visit()` transforms CST to AST
4. **Output**: Returns `WodRuntimeScript` with source text and parsed statements
