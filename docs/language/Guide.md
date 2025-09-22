# WodScript Language Guide

This guide explains the syntax and structure of the WOD Wiki language as implemented by the parser and lexer.

## Overview
- Tokenization: see src/parser/timer.tokens.ts
- Grammar rules: see src/parser/timer.parser.ts
- Visitor and AST traversal: see src/parser/timer.visitor.ts
- Markdown timer support: src/parser/md-timer.ts

## Example
```
# Simple timer
Every 1:00 for 5 rounds:
  10 push-ups
  15 sit-ups
```

## Concepts
- Fragments: Action, Timer, Rounds, Increment, Effort, Rep, Resistance, Distance, Text
- Composition: Fragments combine to form executable blocks

## Semantics
- Deterministic interpretation; time anchors and laps; parent-child metric inheritance

## References
- Tests: src/WodScript.test.ts, src/runtime/*test.ts
- Stories: stories/parsing/, stories/runtime/
