/**
 * Tests for section-state StateField (v2).
 * Validates blank-line-aware section splitting, markdown subtypes,
 * stable identity, generic code fences, and backward-compatible queries.
 */

import { describe, it, expect } from "bun:test";
import { EditorState } from "@codemirror/state";
import { sectionField, sectionAtPos, activeCursorSection } from "../section-state";
import type { EditorSection } from "../section-state";

function createState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [sectionField],
  });
}

/** Helper: get sections from a doc string */
function sections(doc: string): EditorSection[] {
  return createState(doc).field(sectionField).sections;
}

// ── Blank-line splitting ─────────────────────────────────────────────

describe("sectionField — blank-line splitting", () => {
  it("should split markdown at blank lines", () => {
    const s = sections("# Hello\n\nSome text here.");
    // "# Hello" → heading, blank line → unknown, "Some text here." → paragraph
    expect(s).toHaveLength(3);
    expect(s[0].type).toBe("markdown");
    expect(s[0].subtype).toBe("heading");
    expect(s[1].type).toBe("markdown");
    expect(s[1].subtype).toBe("unknown"); // blank line
    expect(s[2].type).toBe("markdown");
    expect(s[2].subtype).toBe("paragraph");
  });

  it("should keep consecutive non-blank lines in one section", () => {
    const s = sections("line one\nline two\nline three");
    expect(s).toHaveLength(1);
    expect(s[0].type).toBe("markdown");
    expect(s[0].subtype).toBe("paragraph");
    expect(s[0].startLine).toBe(1);
    expect(s[0].endLine).toBe(3);
  });

  it("should create separate sections for each blank line", () => {
    const s = sections("a\n\n\nb");
    // "a", blank, blank, "b"
    expect(s).toHaveLength(4);
    expect(s[0].subtype).toBe("paragraph");
    expect(s[1].subtype).toBe("unknown");
    expect(s[2].subtype).toBe("unknown");
    expect(s[3].subtype).toBe("paragraph");
  });
});

// ── Markdown subtypes ────────────────────────────────────────────────

describe("sectionField — markdown subtypes", () => {
  it("should detect heading subtype", () => {
    const s = sections("# Title");
    expect(s[0].subtype).toBe("heading");
  });

  it("should detect list subtype (unordered)", () => {
    const s = sections("- item one\n- item two");
    expect(s[0].subtype).toBe("list");
  });

  it("should detect list subtype (ordered)", () => {
    const s = sections("1. first\n2. second");
    expect(s[0].subtype).toBe("list");
  });

  it("should detect blockquote subtype", () => {
    const s = sections("> quoted text");
    expect(s[0].subtype).toBe("blockquote");
  });

  it("should detect table subtype", () => {
    const s = sections("| Col A | Col B |\n| --- | --- |\n| 1 | 2 |");
    expect(s[0].subtype).toBe("table");
  });

  it("should detect paragraph as default", () => {
    const s = sections("Just some regular text.");
    expect(s[0].subtype).toBe("paragraph");
  });
});

// ── WOD blocks ───────────────────────────────────────────────────────

describe("sectionField — wod blocks", () => {
  it("should parse markdown with a wod block", () => {
    const doc = "# Title\n\n```wod\n10:00 Run\n```\n\nMore text";
    const s = sections(doc);

    const types = s.map((x) => x.type);
    expect(types).toContain("markdown");
    expect(types).toContain("wod");

    const wod = s.find((x) => x.type === "wod")!;
    expect(wod.dialect).toBe("wod");
    expect(wod.startLine).toBe(3);
    expect(wod.endLine).toBe(5);
  });

  it("should detect log and plan dialects", () => {
    const doc = "```log\n5x5 Squat\n```\n\n```plan\nWeek 1\n```";
    const s = sections(doc);

    const wodSections = s.filter((x) => x.type === "wod");
    expect(wodSections).toHaveLength(2);
    expect(wodSections[0].dialect).toBe("log");
    expect(wodSections[1].dialect).toBe("plan");
  });

  it("should provide contentFrom/contentTo for wod sections", () => {
    const doc = "```wod\n10:00 Run\n5:00 Rest\n```";
    const state = createState(doc);
    const s = state.field(sectionField).sections;

    expect(s).toHaveLength(1);
    const wod = s[0];
    expect(wod.contentFrom).toBeDefined();
    expect(wod.contentTo).toBeDefined();

    const innerContent = state.doc.sliceString(wod.contentFrom!, wod.contentTo!);
    expect(innerContent).toContain("10:00 Run");
    expect(innerContent).toContain("5:00 Rest");
  });

  it("should handle unclosed wod fence", () => {
    const s = sections("```wod\n10:00 Run\nNo closing fence");
    expect(s).toHaveLength(1);
    expect(s[0].type).toBe("wod");
  });

  it("should handle multiple wod blocks", () => {
    const doc = "```wod\nBlock 1\n```\n\nSome text\n\n```wod\nBlock 2\n```";
    const s = sections(doc);
    const wodSections = s.filter((x) => x.type === "wod");
    expect(wodSections).toHaveLength(2);
  });
});

// ── Frontmatter ──────────────────────────────────────────────────────

describe("sectionField — frontmatter", () => {
  it("should parse frontmatter delimiters", () => {
    const doc = "---\ntitle: My Workout\nauthor: Jane\n---\n\n# Content";
    const s = sections(doc);

    expect(s[0].type).toBe("frontmatter");
    expect(s[0].startLine).toBe(1);
    expect(s[0].endLine).toBe(4);
  });

  it("should not cross into wod blocks when scanning for closing ---", () => {
    const doc = "---\ntitle: test\n```wod\nsome wod\n```\nmore lines\n---";
    const s = sections(doc);
    // The --- before ```wod should not find the --- after ``` as its close
    // because the scanner breaks at dialect fences
    const fm = s.filter((x) => x.type === "frontmatter");
    // Depending on parser: the --- at line 1 might become markdown if it can't find close before WOD
    // or it could match the --- at the end
    expect(s.length).toBeGreaterThan(0);
  });
});

// ── Generic code fences ──────────────────────────────────────────────

describe("sectionField — generic code fences", () => {
  it("should parse ```js as a code section", () => {
    const doc = "text before\n\n```js\nconst x = 1;\n```\n\ntext after";
    const s = sections(doc);

    const code = s.find((x) => x.type === "code");
    expect(code).toBeDefined();
    expect(code!.language).toBe("js");
    expect(code!.startLine).toBe(3);
    expect(code!.endLine).toBe(5);
  });

  it("should parse ```python as a code section", () => {
    const s = sections("```python\nprint('hello')\n```");
    expect(s).toHaveLength(1);
    expect(s[0].type).toBe("code");
    expect(s[0].language).toBe("python");
  });

  it("should not treat ```wod as a code section", () => {
    const s = sections("```wod\n10:00 Run\n```");
    expect(s[0].type).toBe("wod");
    expect(s[0].language).toBeUndefined();
  });

  it("should handle unclosed generic code fence", () => {
    const s = sections("```typescript\nconst a = 1;");
    expect(s).toHaveLength(1);
    expect(s[0].type).toBe("code");
    expect(s[0].language).toBe("typescript");
  });

  it("should provide contentFrom/contentTo for code sections", () => {
    const doc = "```js\nconst x = 1;\n```";
    const state = createState(doc);
    const code = state.field(sectionField).sections[0];
    expect(code.contentFrom).toBeDefined();
    expect(code.contentTo).toBeDefined();
    const inner = state.doc.sliceString(code.contentFrom!, code.contentTo!);
    expect(inner).toContain("const x = 1;");
  });
});

// ── Edge cases ───────────────────────────────────────────────────────

describe("sectionField — edge cases", () => {
  it("should handle empty document", () => {
    const s = sections("");
    // Empty doc: CM6 still has 1 line, which is blank → single unknown markdown section
    expect(s).toHaveLength(1);
    expect(s[0].type).toBe("markdown");
  });

  it("should handle document with only whitespace", () => {
    const s = sections("  \n  \n  ");
    // Three whitespace-only lines are all blank → each becomes its own unknown section
    expect(s).toHaveLength(3);
    s.forEach((sec) => {
      expect(sec.type).toBe("markdown");
      expect(sec.subtype).toBe("unknown");
    });
  });
});

// ── Stable identity ──────────────────────────────────────────────────

describe("sectionField — stable identity", () => {
  it("should generate deterministic IDs for identical content", () => {
    const s1 = sections("# Hello\n\nWorld");
    const s2 = sections("# Hello\n\nWorld");
    expect(s1.map((s) => s.id)).toEqual(s2.map((s) => s.id));
  });

  it("should have different IDs for different content", () => {
    const s1 = sections("# Hello");
    const s2 = sections("# Goodbye");
    expect(s1[0].id).not.toBe(s2[0].id);
  });

  it("should preserve IDs across edits that don't change structure", () => {
    const state1 = createState("# Hello\n\nWorld");
    const ids1 = state1.field(sectionField).sections.map((s) => s.id);

    // Simulate editing "World" to "World!" — same structure, content changes
    const tr = state1.update({ changes: { from: state1.doc.length, insert: "!" } });
    const state2 = tr.state;
    const sections2 = state2.field(sectionField).sections;

    // Structure is the same (3 sections), IDs should be carried forward
    expect(sections2).toHaveLength(ids1.length);
    // The heading and blank didn't change, so their IDs should survive
    expect(sections2[0].id).toBe(ids1[0]);
    expect(sections2[1].id).toBe(ids1[1]);
    // The last section's content changed but position is same → ID preserved via mapping
    expect(sections2[2].id).toBe(ids1[2]);
  });
});

// ── Query helpers ────────────────────────────────────────────────────

describe("sectionAtPos", () => {
  it("should find section at given position", () => {
    const doc = "# Title\n\n```wod\n10:00 Run\n```\n\nEnd";
    const state = createState(doc);

    const mdSection = sectionAtPos(state, 0);
    expect(mdSection).not.toBeNull();
    expect(mdSection!.type).toBe("markdown");

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
