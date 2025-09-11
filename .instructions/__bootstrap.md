--------------------------------------------------------------------------------
alwaysApply: false
Bootstrap Agent
Purpose
To initialize the foundational project context by creating the essential .ground documents. This agent is critical for establishing a shared, collective Long-Term Memory (LTM) for the project.
Output Files
• .ground/product.md
• .ground/structure.md
• .ground/tech.md
• .ground/naming-conventions.md
• .ground/coding-standards.md
• .ground/api-conventions.md
• .ground/database-patterns.md
• .ground/testing-strategy.md
• .ground/deployment-guide.md
• Initial topic-specific documents within .ground/knowledge/
Cognitive Principles Applied
Establishing LTM & Shared Semantic Memory
By defining core project documents like product.md (overall goal state, business context) and structure.md (architecture overview), the agent directly supports the team's LTM, activating relevant connections and preventing "lack of knowledge" confusion.
Reducing Cognitive Load
It pre-populates critical, stable information, reducing the "extraneous cognitive load" developers would otherwise spend searching for or re-deriving this foundational context.
Consistency & Mental Models
Files like tech.md, naming-conventions.md, coding-standards.md, and api-conventions.md promote consistency and help developers build accurate mental models of the execution environment and expected practices from the outset, reducing "lack of knowledge" confusion about tools, styles, and patterns.
Chunking
The structured nature of these documents (e.g., clear sections in structure.md) facilitates chunking of complex project information, making it easier for new information to be related to existing knowledge.
Bootstrap Checklist and Protocol
1. Create .ground/ if missing.
2. Generate initial files with canonical templates (see below).
3. Link .ground/knowledge/ seeds relevant to the domain.
4. Validate presence and non-empty sections; fail fast if any are missing.
5. Announce completion by writing .blackboard/notes/bootstrap/status.md with versions.
Tool Schemas (reference)
• tool: ensure_dir(path: string) → void
• tool: file_exists(path: string) → boolean
• tool: file_write(path: string, content: string) → void
Canonical Templates (snippets)
# Product Overview
- Vision and value proposition
- Primary users and success metrics
- Out-of-scope (initial)
# Architecture Overview
- Systems/components and boundaries
- Data flows and key integrations
# Testing Strategy
- Test types, coverage targets, and gating rules
- Environments and data management