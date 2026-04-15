import { EditorState } from "@codemirror/state";
import { describe, it, expect, beforeEach } from "vitest";
import {
  wodResultsWidget,
  updateSectionResults,
  wodResultsField,
  wodResultsDecorations,
} from "../wod-results-widget";
import { sectionField } from "../section-state";
import type { WorkoutResult } from "@/types/storage";

describe("wod-results-widget", () => {
  const content = "```wod\n10 Pushups\n```";
  let state: EditorState;

  beforeEach(() => {
    state = EditorState.create({
      doc: content,
      extensions: [sectionField, ...wodResultsWidget],
    });
  });

  it("should initialize with empty results", () => {
    const results = state.field(wodResultsField);
    expect(results.size).toBe(0);
  });

  it("should update results for a section", () => {
    const { sections } = state.field(sectionField);
    const wodSection = sections.find((s) => s.type === "wod");
    expect(wodSection).toBeDefined();

    const mockResult: WorkoutResult = {
      id: "test-id",
      noteId: "test-note",
      sectionId: wodSection!.id,
      segmentId: wodSection!.id,
      completedAt: Date.now(),
      data: { duration: 60000 },
    };

    const tr = state.update({
      effects: [
        updateSectionResults.of({
          sectionId: wodSection!.id,
          results: [mockResult],
        }),
      ],
    });
    
    state = tr.state;
    const results = state.field(wodResultsField);
    expect(results.get(wodSection!.id)).toEqual([mockResult]);
  });

  it("should generate one decoration for results (the bar)", () => {
    const { sections } = state.field(sectionField);
    const wodSection = sections.find((s) => s.type === "wod");

    const mockResult: WorkoutResult = {
      id: "test-id",
      noteId: "test-note",
      sectionId: wodSection!.id,
      segmentId: wodSection!.id,
      completedAt: Date.now(),
      data: { duration: 60000 },
    };

    const tr = state.update({
      effects: [
        updateSectionResults.of({
          sectionId: wodSection!.id,
          results: [mockResult],
        }),
      ],
    });

    state = tr.state;
    const decos = state.field(wodResultsDecorations);
    
    let count = 0;
    decos.between(0, state.doc.length, () => {
      count++;
    });
    
    // Only 1 decoration (the results bar after the fence)
    expect(count).toBe(1);
  });
});
