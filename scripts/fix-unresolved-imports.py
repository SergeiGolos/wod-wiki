#!/usr/bin/env python3
"""
Auto-fix unresolved imports identified by knip.

Run with:
    python3 scripts/fix-unresolved-imports.py

Backs up every changed file to /tmp/fix-unresolved-imports-backup/.
"""

import shutil
import sys
from pathlib import Path

BACKUP_DIR = Path("/tmp/fix-unresolved-imports-backup")

# Each entry: (file_path, old_text, new_text, description)
FIXES: list[tuple[str, str, str, str]] = [
    # 1. NotebookContext moved to src/contexts/
    (
        "src/components/molecules/AddToNotebookButton.tsx",
        "from './NotebookContext'",
        "from '@/contexts/NotebookContext'",
        "NotebookContext moved to contexts/",
    ),
    (
        "src/components/organisms/notebook/NotebookMenu.tsx",
        "from './NotebookContext'",
        "from '@/contexts/NotebookContext'",
        "NotebookContext moved to contexts/",
    ),
    (
        "src/components/organisms/workbench/NotebooksSection.tsx",
        "from '@/components/organisms/notebook/NotebookContext'",
        "from '@/contexts/NotebookContext'",
        "NotebookContext moved to contexts/",
    ),
    (
        "src/components/organisms/workbench/NoteDetailsPanel.tsx",
        "from '@/components/organisms/notebook/NotebookContext'",
        "from '@/contexts/NotebookContext'",
        "NotebookContext moved to contexts/",
    ),
    # 2. ThemeProvider moved to src/contexts/
    (
        "src/components/organisms/CommitGraph.tsx",
        "from '../theme/ThemeProvider'",
        "from '@/contexts/ThemeProvider'",
        "ThemeProvider moved to contexts/",
    ),
    # 3. Editor overlays live in src/components/Editor/overlays/
    (
        "src/components/organisms/editor/InlineCommandBar.tsx",
        'from "./WodCommand"',
        'from "@/components/Editor/overlays/WodCommand"',
        "WodCommand moved to Editor/overlays/",
    ),
    (
        "src/components/organisms/editor/MetricInlinePanel.tsx",
        'from "./WodCommand"',
        'from "@/components/Editor/overlays/WodCommand"',
        "WodCommand moved to Editor/overlays/",
    ),
    (
        "src/components/organisms/editor/OverlayTrack.tsx",
        'from "./useOverlayWidthState"',
        'from "@/components/Editor/overlays/useOverlayWidthState"',
        "useOverlayWidthState moved to Editor/overlays/",
    ),
    (
        "src/components/organisms/editor/WodCompanion.tsx",
        'from "./WodCommand"',
        'from "@/components/Editor/overlays/WodCommand"',
        "WodCommand moved to Editor/overlays/",
    ),
    # 4. Review barrel is review-grid-index.ts, not index.ts
    (
        "src/components/organisms/layout/Workbench.tsx",
        "from '@/components/organisms/review'",
        "from '@/components/organisms/review/review-grid-index'",
        "Review barrel renamed to review-grid-index",
    ),
    # 5. IMetric folded into Metric.ts
    (
        "src/components/molecules/StatementDisplay.test.tsx",
        "from '@/core/models/IMetric'",
        "from '@/core/models/Metric'",
        "IMetric folded into Metric.ts",
    ),
    # 6. Stores relative paths
    (
        "src/stores/workbenchSyncStore.ts",
        "from '../Editor/types'",
        "from '@/components/Editor/types'",
        "Editor types path fix",
    ),
    (
        "src/stores/workbenchSyncStore.ts",
        "from '../Editor/utils/documentStructure'",
        "from '@/components/Editor/utils/documentStructure'",
        "Editor utils path fix",
    ),
    # 7. Runtime tests
    (
        "tests/harness/__tests__/RuntimeTestBuilder.test.ts",
        "from '@/runtime/BlockBuilder'",
        "from '@/runtime/compiler/BlockBuilder'",
        "BlockBuilder moved to compiler/",
    ),
]

# CDL interpreter source files: ./types → ../types, ./column-definition-language → ../column-definition-language
CDL_SOURCE_FILES = [
    "src/components/organisms/review/interpreters/cdlCellRenderer.tsx",
    "src/components/organisms/review/interpreters/cdlFallbackInterpreter.ts",
    "src/components/organisms/review/interpreters/cdlFilterInterpreter.ts",
    "src/components/organisms/review/interpreters/cdlGraphInterpreter.ts",
    "src/components/organisms/review/interpreters/cdlSortInterpreter.ts",
    "src/components/organisms/review/interpreters/cdlSourceResolver.ts",
]
for f in CDL_SOURCE_FILES:
    FIXES.append((f, "from './types'", "from '../types'", "CDL types path fix"))
    FIXES.append((f, "from './column-definition-language'", "from '../column-definition-language'", "CDL column-definition-language path fix"))

# CDL interpreter test files: ../column-definition-language → ../../column-definition-language
CDL_TEST_FILES = [
    "src/components/organisms/review/interpreters/__tests__/cdlCellRenderer.test.tsx",
    "src/components/organisms/review/interpreters/__tests__/cdlFallbackInterpreter.test.ts",
    "src/components/organisms/review/interpreters/__tests__/cdlFilterInterpreter.test.ts",
    "src/components/organisms/review/interpreters/__tests__/cdlGraphInterpreter.test.ts",
    "src/components/organisms/review/interpreters/__tests__/cdlSortInterpreter.test.ts",
    "src/components/organisms/review/interpreters/__tests__/cdlSourceResolver.test.ts",
    "src/components/organisms/review/interpreters/__tests__/derivedColumns.test.ts",
]
for f in CDL_TEST_FILES:
    FIXES.append((f, "from '../column-definition-language'", "from '../../column-definition-language'", "CDL test column-definition-language path fix"))

# CDL test helpers: ../types → ../../types
FIXES.append((
    "src/components/organisms/review/interpreters/__tests__/test-helpers.ts",
    "from '../types'",
    "from '../../types'",
    "CDL test helpers types path fix",
))

# derivedColumns.test.ts also imports ../types
FIXES.append((
    "src/components/organisms/review/interpreters/__tests__/derivedColumns.test.ts",
    "from '../types'",
    "from '../../types'",
    "CDL derivedColumns types path fix",
))

# 8. useBlockMemory test: IMemoryEntry → MemoryEntry from types/executionSnapshot
FIXES.append((
    "src/runtime/hooks/__tests__/useBlockMemory.test.ts",
    "from '../../memory/IMemoryEntry'",
    "from '../../types/executionSnapshot'",
    "MemoryEntry moved to types/executionSnapshot",
))
FIXES.append((
    "src/runtime/hooks/__tests__/useBlockMemory.test.ts",
    "IMemoryEntry",
    "MemoryEntry",
    "Rename IMemoryEntry to MemoryEntry",
))


def apply_fixes():
    changed = 0
    skipped = 0
    errors = 0

    for file_path, old_text, new_text, desc in FIXES:
        p = Path(file_path)
        if not p.exists():
            print(f"  SKIP (missing): {file_path} — {desc}")
            skipped += 1
            continue

        content = p.read_text()
        if old_text not in content:
            print(f"  SKIP (no match): {file_path} — {desc}")
            skipped += 1
            continue

        # Backup
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        backup = BACKUP_DIR / p.name
        shutil.copy2(p, backup)

        new_content = content.replace(old_text, new_text)
        p.write_text(new_content)
        print(f"  FIXED: {file_path} — {desc}")
        changed += 1

    return changed, skipped, errors


def fix_group_metric():
    """GroupMetric.ts imports GroupType from a non-existent file. Define it locally."""
    p = Path("src/runtime/compiler/metrics/GroupMetric.ts")
    if not p.exists():
        print("  SKIP (missing): src/runtime/compiler/metrics/GroupMetric.ts")
        return 0

    content = p.read_text()
    old = 'import { GroupType } from "../../../parser/timer.visitor";'
    new = ''
    if old not in content:
        print("  SKIP (no match): GroupMetric.ts — GroupType import")
        return 0

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, BACKUP_DIR / p.name)

    content = content.replace(old, new)
    # Insert type definition before the class
    content = content.replace(
        "export class GroupMetric implements IMetric {",
        "export type GroupType = string;\n\nexport class GroupMetric implements IMetric {",
    )
    p.write_text(content)
    print("  FIXED: src/runtime/compiler/metrics/GroupMetric.ts — defined GroupType locally")
    return 1


def fix_effort_fallback():
    """EffortFallbackStrategy.ts imports IRuntimeBlockBuilder from non-existent path."""
    p = Path("src/runtime/compiler/strategies/fallback/EffortFallbackStrategy.ts")
    if not p.exists():
        print("  SKIP (missing): EffortFallbackStrategy.ts")
        return 0

    content = p.read_text()

    # Replace import
    old_import = 'import type { IRuntimeBlockBuilder } from "../../../contracts/core/IRuntimeBlockBuilder";'
    new_import = 'import { BlockBuilder } from "../../BlockBuilder";'

    if old_import not in content:
        print("  SKIP (no match): EffortFallbackStrategy.ts — IRuntimeBlockBuilder import")
        return 0

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, BACKUP_DIR / p.name)

    content = content.replace(old_import, new_import)
    content = content.replace("IRuntimeBlockBuilder", "BlockBuilder")
    p.write_text(content)
    print("  FIXED: src/runtime/compiler/strategies/fallback/EffortFallbackStrategy.ts — replaced IRuntimeBlockBuilder with BlockBuilder")
    return 1


def fix_wod_companion_section_geometry():
    """WodCompanion.tsx line 331 has an inline import with wrong path."""
    p = Path("src/components/organisms/editor/WodCompanion.tsx")
    if not p.exists():
        print("  SKIP (missing): WodCompanion.tsx")
        return 0

    content = p.read_text()
    old = "import('../extensions/section-geometry').SectionRect"
    new = "import('@/components/Editor/extensions/section-geometry').SectionRect"

    if old not in content:
        print("  SKIP (no match): WodCompanion.tsx — section-geometry inline import")
        return 0

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, BACKUP_DIR / f"{p.name}.sg")

    content = content.replace(old, new)
    p.write_text(content)
    print("  FIXED: src/components/organisms/editor/WodCompanion.tsx — section-geometry inline import")
    return 1


def main():
    print("=" * 60)
    print("Fixing unresolved imports")
    print("=" * 60)

    changed, skipped, errors = apply_fixes()
    changed += fix_group_metric()
    changed += fix_effort_fallback()
    changed += fix_wod_companion_section_geometry()

    print("=" * 60)
    print(f"Done. Changed: {changed}, Skipped: {skipped}, Errors: {errors}")
    print(f"Backups saved to: {BACKUP_DIR}")
    print("=" * 60)

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
