---
title: "Design Drift Analysis"
date: 2025-06-18
tags: [analysis, design-drift]
---

# Design Drift Analysis

This document outlines the discrepancies found between the source code in the `/src` directory and the design documentation in the `/wod-wiki/Core` directory.

## 1. `CodeFragment.ts` vs. `ICodeFragment.md`

*   **Naming Mismatch**: The design document is named `ICodeFragment.md` and refers to an `ICodeFragment` interface, but the corresponding source file is `src/CodeFragment.ts` which exports a `CodeFragment` interface.
*   **Outdated File Paths**: The markdown file references an old file path `src/core/CodeFragment.ts`, but the actual file is at `src/CodeFragment.ts`.
*   **Monolithic Documentation**: `ICodeFragment.md` contains documentation for all fragment types (e.g., `ActionFragment`, `DistanceFragment`). The code is modular, with each fragment in its own file inside `src/fragments/`. The documentation should be updated to reflect this structure, with individual markdown files for each fragment type.
*   **Wiki-Links**: The markdown uses non-standard wiki-links (e.g., `[[JitStatement]]`) instead of standard markdown links.

## 2. `CodeStatement.ts` / `ICodeStatement.ts` vs. `ICodeStatement.md`

*   **Alignment**: The code and documentation for `ICodeStatement` and the `CodeStatement` abstract class are well-aligned. The properties defined in the markdown match the implementation in the TypeScript files.
*   **Outdated File Paths**: The markdown references `src/ICodeStatement.ts`, which is correct, but the overall pattern of outdated paths in other documents is a concern.

## 3. `WodRuntimeScript.ts` vs. `IScript.md`

*   **Significant Drift**: This shows the most significant drift.
*   **Interface Mismatch**: The design document `IScript.md` describes an interface with properties `Statements` and `Soruce` (sic), while the `WodRuntimeScript.ts` file defines an `IRuntimeScript` interface with `statements` and `source`. The casing is different, and "Source" is misspelled in the markdown.
*   **Missing Methods**: The markdown specifies `from()`, `getId()`, and `getAt()` methods for the `IScript` interface. Neither the `IRuntimeScript` interface nor the `WodRuntimeScript` class in the code implement these methods. This indicates a major feature gap or a significant change in design that was not documented.

## General Observations & Recommendations

1. [x] **Update File Paths**: All design documents in `/wod-wiki/Core` should be reviewed to ensure their file path references are up-to-date with the current project structure.
2.  **Refactor Monolithic Documents**: Large, monolithic documents like `ICodeFragment.md` should be broken down into smaller, more focused documents that mirror the modular structure of the source code. Each fragment should have its own markdown file.
3. [x] **Standardize Naming**: The naming convention for design documents should be consistent with the code it describes (e.g., `CodeFragment.md` instead of `ICodeFragment.md` if the interface is `CodeFragment`).
4. [x] **Remove Wiki-Links**: All non-standard wiki-links should be replaced with standard markdown relative links as per the project guidelines.
5.  **Address Feature Gaps**: The discrepancies in `IScript.md` should be addressed. If the methods are no longer needed, the documentation should be updated. If they are still required, they need to be implemented in the code.
