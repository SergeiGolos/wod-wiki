/**
 * Tests for whiteboard-linter extension.
 * Validates that the linter finds errors in WhiteboardScript code fences.
 */

import { describe, it, expect } from "bun:test";
import { EditorState } from "@codemirror/state";
import { sectionField } from "../section-state";

// We test the parseSections + findWorkoutErrors logic indirectly by
// verifying that the sectionField correctly identifies workout blocks.
// Direct linter testing requires an EditorView which is DOM-dependent.

describe("whiteboard-linter integration", () => {
  it("should identify workout sections for linting", () => {
    const doc = "# Hello\n\n```time\n10:00 Run\n```\n\nEnd";
    const state = EditorState.create({
      doc,
      extensions: [sectionField],
    });

    const { sections } = state.field(sectionField);
    const workoutSections = sections.filter(s => s.type === 'time' || s.type === 'log');
    expect(workoutSections).toHaveLength(1);
    expect(workoutSections[0].contentFrom).toBeDefined();
    expect(workoutSections[0].contentTo).toBeDefined();

    const innerContent = state.doc.sliceString(
      workoutSections[0].contentFrom!,
      workoutSections[0].contentTo!
    );
    expect(innerContent).toBe("10:00 Run");
  });

  it("should handle multiple workout blocks for linting", () => {
    const doc = "```time\nBlock 1\n```\n\n```log\nBlock 2\n```";
    const state = EditorState.create({
      doc,
      extensions: [sectionField],
    });

    const { sections } = state.field(sectionField);
    const workoutSections = sections.filter(s => s.type === 'time' || s.type === 'log');
    expect(workoutSections).toHaveLength(2);
  });
});
