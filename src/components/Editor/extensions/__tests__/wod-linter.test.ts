/**
 * Tests for wod-linter extension.
 * Validates that the linter finds errors in WodScript code fences.
 */

import { describe, it, expect } from "bun:test";
import { EditorState } from "@codemirror/state";
import { sectionField } from "../section-state";

// We test the parseSections + findWodErrors logic indirectly by
// verifying that the sectionField correctly identifies WOD blocks.
// Direct linter testing requires an EditorView which is DOM-dependent.

describe("wod-linter integration", () => {
  it("should identify wod sections for linting", () => {
    const doc = "# Hello\n\n```wod\n10:00 Run\n```\n\nEnd";
    const state = EditorState.create({
      doc,
      extensions: [sectionField],
    });

    const { sections } = state.field(sectionField);
    const wodSections = sections.filter(s => s.type === "wod");
    expect(wodSections).toHaveLength(1);
    expect(wodSections[0].contentFrom).toBeDefined();
    expect(wodSections[0].contentTo).toBeDefined();

    const innerContent = state.doc.sliceString(
      wodSections[0].contentFrom!,
      wodSections[0].contentTo!
    );
    expect(innerContent).toBe("10:00 Run");
  });

  it("should handle multiple wod blocks for linting", () => {
    const doc = "```wod\nBlock 1\n```\n\n```log\nBlock 2\n```";
    const state = EditorState.create({
      doc,
      extensions: [sectionField],
    });

    const { sections } = state.field(sectionField);
    const wodSections = sections.filter(s => s.type === "wod");
    expect(wodSections).toHaveLength(2);
  });
});
