/**
 * Tests for section-state StateField.
 * Validates that the section parser correctly identifies markdown, wod, 
 * and frontmatter sections from document content.
 */

import { describe, it, expect } from "bun:test";
import { EditorState } from "@codemirror/state";
import { sectionField, sectionAtPos, activeCursorSection } from "../section-state";

function createState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [sectionField],
  });
}

describe("sectionField", () => {
  it("should parse a simple markdown document as one markdown section", () => {
    const state = createState("# Hello\n\nSome text here.");
    const { sections } = state.field(sectionField);
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe("markdown");
    expect(sections[0].startLine).toBe(1);
    expect(sections[0].endLine).toBe(3);
  });

  it("should parse markdown with a wod block", () => {
    const doc = "# Title\n\n```wod\n10:00 Run\n```\n\nMore text";
    const state = createState(doc);
    const { sections } = state.field(sectionField);
    expect(sections).toHaveLength(3);

    expect(sections[0].type).toBe("markdown");
    expect(sections[0].startLine).toBe(1);
    expect(sections[0].endLine).toBe(2);

    expect(sections[1].type).toBe("wod");
    expect(sections[1].dialect).toBe("wod");
    expect(sections[1].startLine).toBe(3);
    expect(sections[1].endLine).toBe(5);

    expect(sections[2].type).toBe("markdown");
    expect(sections[2].startLine).toBe(6);
  });

  it("should detect log and plan dialects", () => {
    const doc = "```log\n5x5 Squat\n```\n\n```plan\nWeek 1\n```";
    const state = createState(doc);
    const { sections } = state.field(sectionField);

    expect(sections).toHaveLength(3); // log, markdown (empty line), plan
    expect(sections[0].type).toBe("wod");
    expect(sections[0].dialect).toBe("log");
    expect(sections[2].type).toBe("wod");
    expect(sections[2].dialect).toBe("plan");
  });

  it("should parse frontmatter delimiters", () => {
    const doc = "---\ntitle: My Workout\nauthor: Jane\n---\n\n# Content";
    const state = createState(doc);
    const { sections } = state.field(sectionField);

    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(sections[0].type).toBe("frontmatter");
    expect(sections[0].startLine).toBe(1);
    expect(sections[0].endLine).toBe(4);
  });

  it("should provide contentFrom/contentTo for wod sections", () => {
    const doc = "```wod\n10:00 Run\n5:00 Rest\n```";
    const state = createState(doc);
    const { sections } = state.field(sectionField);

    expect(sections).toHaveLength(1);
    const wod = sections[0];
    expect(wod.contentFrom).toBeDefined();
    expect(wod.contentTo).toBeDefined();

    const innerContent = state.doc.sliceString(wod.contentFrom!, wod.contentTo!);
    expect(innerContent).toContain("10:00 Run");
    expect(innerContent).toContain("5:00 Rest");
  });

  it("should handle empty document", () => {
    const state = createState("");
    const { sections } = state.field(sectionField);
    // Empty doc still has 1 line in CM6, resulting in a single empty markdown section
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe("markdown");
  });

  it("should handle document with only whitespace", () => {
    const state = createState("  \n  \n  ");
    const { sections } = state.field(sectionField);
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe("markdown");
  });

  it("should handle unclosed wod fence", () => {
    const doc = "```wod\n10:00 Run\nNo closing fence";
    const state = createState(doc);
    const { sections } = state.field(sectionField);
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe("wod");
  });

  it("should handle multiple wod blocks", () => {
    const doc = "```wod\nBlock 1\n```\n\nSome text\n\n```wod\nBlock 2\n```";
    const state = createState(doc);
    const { sections } = state.field(sectionField);

    const wodSections = sections.filter(s => s.type === "wod");
    expect(wodSections).toHaveLength(2);
  });
});

describe("sectionAtPos", () => {
  it("should find section at given position", () => {
    const doc = "# Title\n\n```wod\n10:00 Run\n```\n\nEnd";
    const state = createState(doc);

    // Position in markdown (start of doc)
    const mdSection = sectionAtPos(state, 0);
    expect(mdSection).not.toBeNull();
    expect(mdSection!.type).toBe("markdown");

    // Position in wod block
    const wodPos = doc.indexOf("10:00");
    const wodSection = sectionAtPos(state, wodPos);
    expect(wodSection).not.toBeNull();
    expect(wodSection!.type).toBe("wod");
  });
});

describe("activeCursorSection", () => {
  it("should return section at cursor position", () => {
    const doc = "# Title\n\n```wod\n10:00 Run\n```";
    const state = EditorState.create({
      doc,
      extensions: [sectionField],
      selection: { anchor: 0 },
    });

    const section = activeCursorSection(state);
    expect(section).not.toBeNull();
    expect(section!.type).toBe("markdown");
  });
});
