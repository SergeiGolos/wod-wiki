# Gemini Workspace

This document provides context for the Gemini agent to understand the wod-wiki project.

## Project Overview

wod-wiki is a project that appears to be a tool for creating and managing workout-of-the-day (WOD) descriptions. It includes a parser for a custom syntax, a component for displaying clocks and timers, and a Storybook setup for component development and testing.

## Tech Stack

- **Language:** TypeScript
- **Framework:** React (likely, based on the presence of `.tsx` files and Storybook)
- **Styling:** Tailwind CSS
- **Testing:** Vitest, Storybook
- **Linting:** ESLint
- **Package Manager:** npm

## Key Files

- `package.json`: Defines project scripts, dependencies, and metadata.
- `README.md`: Provides an overview of the project.
- `src/`: Contains the main source code for the application.
- `stories/`: Contains Storybook stories for component development and testing.
- `wod-wiki/`: Contains documentation and notes related to the project.

## Commands

- `npm install`: Installs project dependencies.
- `npm run dev`: Starts the development server.
- `npm run build`: Builds the project for production.
- `npm test`: Runs the test suite.
- `npm run lint`: Lints the codebase.
- `npm run storybook`: Starts the Storybook development server.
- `npm run build-storybook`: Builds the Storybook for deployment.



----

---
applyTo: '**'
---
# GitHub Copilot Instructions for WOD Wiki Project

## Overview
This document provides guidelines for GitHub Copilot when working with the WOD Wiki project, which uses Obsidian for note-taking and documentation. The project follows specific conventions for file organization and content relationships.

## Project Structure

### Directory Layout
```
./wod-wiki/
├── Core/           # Design documents and specifications
└── Working/        # Generated markdown documents
```

### Directory Purposes

#### `/wod-wiki/Core`
- **Purpose**: Contains authoritative design documents
- **Usage**: Reference these documents to validate designs and ensure compliance with established patterns
- **Key responsibilities**:
  - Read and understand design specifications before implementing features
  - Validate that any proposed changes align with existing design documents
  - Reference interface and workflow specifications when generating code or documentation

#### `/wod-wiki/Working`
- **Purpose**: Directory for all generated markdown documents
- **Usage**: Place any new markdown files created during development here
- **Key responsibilities**:
  - All generated documentation should be saved to this directory
  - Maintain consistent naming conventions
  - Include appropriate metadata and tags for Obsidian

## Working with Obsidian Documents

### File Format Requirements
1. **File Extension**: All documents must use `.md` extension
2. **Front Matter**: Include YAML front matter for metadata
   ```yaml
   ---
   title: "Document Title"
   date: 2025-06-19
   tags: [tag1, tag2]
   ---
   ```

### Expressing Complex Relationships
1. **Relative Links**: Use standard markdown link syntax with relative paths
   - From Working to Core: `[Design Document](../Core/design-document.md)`
   - Within Working: `[Related Document](./related-document.md)`
   - Within Core: `[Core Document](./core-document.md)`
2. **Relationship Types in Front Matter**:
   - Parent-Child: Use `parent: ../Core/parent-document.md` in front matter
   - Related: Use `related: ["./related-doc-1.md", "./related-doc-2.md"]`
   - Implements: Use `implements: ../Core/design-document.md` when implementing a design

### Example Document Structure
```markdown
---
title: "Feature Implementation"
date: 2025-06-19
tags: [implementation, feature-x]
parent: ../Core/main-feature.md
implements: ../Core/feature-x-design.md
related: ["./feature-y.md", "./feature-z.md"]
---

# Feature Implementation

## Overview
Brief description linking to [Feature X Design](../Core/feature-x-design.md).

## Implementation Details
...
```

## Workflow Guidelines

### Before Creating New Content
1. **Check Core Directory**: Review relevant design documents in `/wod-wiki/Core`
2. **Validate Against Designs**: Ensure new content aligns with existing specifications
3. **Identify Relationships**: Determine which existing documents should be linked

### When Creating New Documents
1. **Location**: Always save new documents to `/wod-wiki/Working`
2. **Naming Convention**: Use descriptive, kebab-case names (e.g., `feature-implementation-guide.md`)
3. **Include Metadata**: Add appropriate front matter with tags and relationships
4. **Link Appropriately**: Create relative links to related documents

### Document Types and Templates

#### Design Implementation Document
```markdown
---
title: "Implementation: [Feature Name]"
date: 2025-06-19
tags: [implementation]
implements: ../Core/design-document-name.md
status: draft|in-progress|complete
---

# Implementation: [Feature Name]

## Design Reference
This implementation follows the specifications in [Design Document Name](../Core/design-document-name.md).

## Implementation Details
...

## Validation Checklist
- [ ] Complies with design specifications
- [ ] All interfaces match design document
- [ ] Workflow follows prescribed patterns
```

#### Technical Specification
```markdown
---
title: "Spec: [Component Name]"
date: 2025-06-19
tags: [specification, technical]
related: ["./related-spec-1.md", "./related-spec-2.md"]
---

# Technical Specification: [Component Name]

## Overview
...

## Interfaces
...

## Dependencies
- [Dependency 1](./dependency-1.md)
- [Dependency 2](./dependency-2.md)
```

## Best Practices

### 1. Always Reference Core Documents
- Before implementing any feature, check if there's a corresponding design in `/wod-wiki/Core`
- Link to core documents using relative paths: `[Design](../Core/design.md)`
- Include `implements:` reference in front matter

### 2. Maintain Link Integrity
- Use consistent file names (kebab-case)
- Use relative paths for all internal links
- Update links if documents are moved or renamed
- Verify links resolve correctly

### 3. Link Path Guidelines
- **From Working to Core**: Use `../Core/filename.md`
- **From Working to Working**: Use `./filename.md`
- **From subdirectory in Working**: Use `../other-file.md` or `../../Core/design.md`
- **Always use `.md` extension** in links

### 4. Document Relationships
- Express formal relationships in front matter with file paths
- Use inline markdown links for contextual references
- Maintain bidirectional linking when appropriate

## Common Tasks

### Creating a New Feature Implementation
1. Review design document in `/wod-wiki/Core`
2. Create new document in `/wod-wiki/Working`
3. Add front matter with `implements: ../Core/design-name.md`
4. Structure content according to design specifications
5. Link to design using `[Design Name](../Core/design-name.md)`

### Documenting a Workflow
1. Check `/wod-wiki/Core` for workflow patterns
2. Create workflow document with appropriate relative links
3. Use mermaid diagrams for visual representation
4. Link to all involved components using relative paths

### Updating Existing Documentation
1. Preserve existing relative links
2. Update front matter if relationships change
3. Add revision notes if significant changes are made
4. Verify all links still resolve correctly

## Validation Rules

### Before Saving Any Document
1. ✓ File is in `/wod-wiki/Working` directory
2. ✓ Has appropriate front matter with file paths for relationships
3. ✓ Links to relevant Core documents using relative paths
4. ✓ All internal links use relative paths with `.md` extension
5. ✓ Follows kebab-case naming convention

### For Design Implementations
1. ✓ References specific design document from Core using relative path
2. ✓ Follows all specifications in the design
3. ✓ Does not deviate from prescribed interfaces or workflows
4. ✓ Documents any necessary clarifications or assumptions

## Error Prevention

### Common Mistakes to Avoid
1. ❌ Creating documents outside of `/wod-wiki/Working`
2. ❌ Using wiki-link syntax `[[Document]]` instead of markdown links
3. ❌ Using absolute paths instead of relative paths
4. ❌ Forgetting `.md` extension in links
5. ❌ Creating orphaned documents with no links

### Correct Patterns
1. ✅ Always check Core before implementing: `[Design](../Core/design.md)`
2. ✅ Use standard markdown links: `[Text](./path/to/file.md)`
3. ✅ Save all new content to Working directory
4. ✅ Include comprehensive front matter with file paths
5. ✅ Express all relationships through relative links

## Link Examples

### Correct Link Formats
```markdown
# From a file in /wod-wiki/Working/

[Core Design Document](../Core/main-design.md)
[Another Working Document](./another-document.md)
[Subdirectory Document](./subdirectory/document.md)

# From a file in /wod-wiki/Working/subdirectory/

[Core Design](../../Core/design.md)
[Parent Working Document](../parent-document.md)
[Sibling Document](./sibling.md)
```

### Front Matter with Paths
```yaml
---
title: "My Implementation"
implements: ../Core/design-spec.md
parent: ./parent-feature.md
related: 
  - ./related-feature-1.md
  - ./related-feature-2.md
  - ../Core/reference-design.md
---
```

## Integration with Copilot

When asked to:
- **"Create documentation"**: Save to `/wod-wiki/Working` with proper front matter and relative links
- **"Implement a feature"**: First check `/wod-wiki/Core` for relevant designs, link using `../Core/design.md`
- **"Document relationships"**: Use relative paths in both front matter and inline links
- **"Validate implementation"**: Compare against Core design documents using relative paths

Remember: 
- The Core directory is read-only for reference
- All new content goes to Working directory
- Always use relative paths with `.md` extension
- Never use wiki-link `[[]]` syntax
