# Documentation Cleanup Plan — WOD-9

**Date:** 2026-05-12  
**Scope:** Clean up outdated documentation and organize into logical groups  
**Status:** Draft

## Current State Analysis

**Total Documentation Files:** ~100+ markdown files  
**Issues Identified:**
- Mixed quality and organization across multiple time periods
- Large brainstorming files from March taking up significant space
- Duplicate/confusing folder structures (tasks/ vs task/)
- Empty folders and temporary artifacts
- No clear organization between current vs. historical documentation

## Cleanup Actions

### 1. Remove Outdated Brainstorming Content (March 2026)

**Files to Remove:**
- `docs/2026-03-19.md` (4KB - daily notes)
- `docs/2026-03-24.md` (24KB - daily notes)
- `docs/2026-04-04.md` (148 bytes - daily notes)
- `docs/brainstorm-view-panel-runtime-coupling.md` (67KB - superseded by newer docs)
- `docs/brainstorm-consistent-parallax.md` (35KB)
- `docs/brainstorm-dialects.md` (32KB)
- `docs/brainstorm-metric-container-alignment.md` (15KB)
- `docs/brainstorm-reporting-targets.md` (24KB)
- `docs/brainstorm-syntax-feedback.md` (26KB)
- `docs/brainstorm-command-palette-unification.md` (12KB)

**Rationale:** These are large brainstorming sessions from March that have been superseded by newer structured documentation. Key insights have been captured in more recent files.

**Space Savings:** ~240KB

### 2. Remove Temporary and Empty Files

**Files to Remove:**
- `docs/Untitled.md` (2.5KB)
- `docs/Untitled 1.canvas` (7KB)
- `docs/Untitled.canvas` (2 bytes)
- `docs/design-system/Untitled.md` (6KB)
- `docs/tasks/Untitled.md` (empty)

**Empty Folders to Remove:**
- `docs/github-issues/` (empty)
- `docs/screenshots/` (empty)

**Rationale:** These are temporary artifacts, empty folders, and workspace detritus.

### 3. Evaluate and Potentially Remove Older Research Documents

**Files to Evaluate (Possible Removal):**
- `docs/note-editor-adr.md` (3KB)
- `docs/note-editor-prd.md` (4KB)
- `docs/note-editor-research-curriculum.md` (17KB)
- `docs/playground-guide-redesign-proposal.md` (18KB)
- `docs/editor-display-elements-research.md` (18KB)
- `docs/decoupling-planner-workbench.md` (6KB)
- `docs/home-page-script-outline.md` (9KB)
- `docs/NAVIGATION_LAYOUT_PLAN.md` (4KB)

**Decision Needed:** Check if these features have been implemented or if the research is still relevant.

### 4. Clean Up Duplicate Folder Structures

**Issue:** Both `docs/tasks/` and `docs/task/` exist with different purposes:
- `docs/tasks/` - Contains task notes (Atomic design, Home Page, etc.)
- `docs/task/` - Contains architecture debt report and E2E investigation

**Action:** Consolidate into single folder structure:
- Keep `docs/plans/` for planning documents
- Move task-specific notes to `docs/plans/tasks/` or remove if obsolete
- Archive completed task notes

### 5. Archive or Remove Obsidian Workspace Artifacts

**Files to Evaluate:**
- `docs/.obsidian/` directory (Obsidian configuration)
- `docs/web/*.canvas` files (visual diagrams)

**Action:** Remove `.obsidian/` as it's IDE-specific configuration. Evaluate canvas files for relevance.

### 6. Review Finishline Folder

**Folder:** `docs/finishline/` (feature roadmap from April 3)

**Content:** Query language, report renderer, command palette editor, etc.

**Decision Needed:** Check if these features are still planned or if the roadmap has changed. Consider moving to `docs/plans/` if still relevant.

## Organizational Structure

### Proposed New Structure

```
docs/
├── design-system/          # Current design system (keep)
│   ├── 00.layout-template/
│   ├── 01.page-templates/
│   ├── 02.page-routes/
│   ├── canvas-template/
│   ├── list-template/
│   ├── note-template/
│   ├── runtime-execution/
│   └── utility/
├── domain-model/           # Core architecture (keep)
├── deep-dives/             # Technical deep dives (keep)
├── plans/                  # Implementation plans (consolidate here)
│   ├── tasks/              # Task-specific planning
│   └── features/           # Feature planning (from finishline?)
├── testing/                # Testing documentation (keep)
├── audits/                 # Audit reports (new, organize here)
│   ├── atomic-design-audit.md
│   ├── atomic-design-remediation-plan.md
│   ├── color-audit.md
│   ├── color-remediation-plan.md
│   └── playground-coverage-audit.md
├── reports/                # Technical reports (new)
│   ├── architecture-debt-report-2026-04-29.md
│   ├── storybook-playground-coverage-assessment.md
│   └── storybook-e2e-architecture-audit.md
└── archive/                # Historical documentation (new)
    ├── brainstorming-2026-03/  # Archived brainstorming
    └── research-2026-q1/       # Older research docs
```

## Dead Code and Architectural Issues

### Identified Issues

1. **Unused Documentation Imports:** Some docs reference components/features that no longer exist
2. **Outdated Architecture Descriptions:** Some older docs describe deprecated patterns
3. **Feature Creep in Documentation:** Some docs describe features that were never implemented

### Actions

1. **Audit for Dead Code References:** Cross-reference documentation with actual codebase
2. **Update Architecture Descriptions:** Ensure docs match current implementation
3. **Flag Unimplemented Features:** Clearly mark features that don't exist yet

## Execution Plan

### Phase 1: Cleanup (Safe Removals)
- Remove daily notes (2026-03-*.md)
- Remove temporary/untitled files
- Remove empty folders
- Remove Obsidian workspace artifacts

### Phase 2: Consolidation (Reorganization)
- Create `docs/audits/` and move audit reports
- Create `docs/reports/` and move technical reports
- Consolidate tasks/ and task/ into plans/tasks/
- Archive or remove finishline/ based on relevance

### Phase 3: Evaluation (Decisions Needed)
- Evaluate older research documents for current relevance
- Decide on canvas files (keep or archive)
- Review and update design-system/ organization if needed

## Success Criteria

1. **Reduced Documentation Size:** Target 30-40% reduction in file count
2. **Clear Organization:** Logical grouping by purpose (design, domain, plans, audits)
3. **No Outdated Content:** All documentation reflects current system state
4. **No Empty/Duplicate Folders:** Single source of truth for each category
5. **Easy Navigation:** Clear hierarchy and findability

## Next Steps

1. Review and approve this plan
2. Execute Phase 1 (safe removals)
3. Create new folder structure (Phase 2)
4. Evaluate older documents (Phase 3)
5. Update CLAUDE.md to reflect new documentation structure
