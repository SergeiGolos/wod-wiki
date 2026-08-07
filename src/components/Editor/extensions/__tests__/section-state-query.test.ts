/**
 * Query fence parsing (#801, suffix grammar #899) — ```query[:type[-N|-full]]
 * fences are first-class section types (distinct from ```lang code blocks and
 * ```widget:<name> registry blocks), parsed via the shared scanFenced helper.
 * The retired ```dashboard fence degrades to a generic code block (#899-8).
 */
import { describe, expect, it } from "bun:test";
import { EditorState } from "@codemirror/state";
import { sectionField } from "../section-state";

function sections(doc: string) {
  return EditorState.create({ doc, extensions: [sectionField] }).field(sectionField).sections;
}

function innerContent(doc: string) {
  const sec = sections(doc)[0];
  const state = EditorState.create({ doc, extensions: [sectionField] });
  return state.doc.sliceString(sec.contentFrom!, sec.contentTo!);
}

describe("sectionField — query fences", () => {
  it("parses ```query into type=query with inner content", () => {
    const doc = "```query\nsum:totalVolume{}\n```";
    const s = sections(doc);
    expect(s).toHaveLength(1);
    expect(s[0].type).toBe("query");
    expect(s[0].widgetType).toBeUndefined();
    expect(innerContent(doc).trim()).toBe("sum:totalVolume{}");
  });

  it("parses the widget suffix onto the section (#899)", () => {
    const s = sections("```query:timeseries-2\nsum:totalVolume{}\n```");
    expect(s[0].type).toBe("query");
    expect(s[0].widgetType).toBe("timeseries");
    expect(s[0].spanCols).toBe(2);
    expect(s[0].spanFull).toBeUndefined();
    expect(s[0].widgetError).toBeUndefined();
  });

  it("parses the -full modifier", () => {
    const s = sections("```query:stacked-bar-full\nsum:x{}\n```");
    expect(s[0].widgetType).toBe("stacked-bar");
    expect(s[0].spanFull).toBe(true);
  });

  it("keeps malformed suffixes as query sections with a widgetError badge", () => {
    const s = sections("```query:bar-9\nsum:x{}\n```");
    expect(s[0].type).toBe("query");
    expect(s[0].widgetType).toBe("bar");
    expect(s[0].widgetError).toContain("outside");
  });

  it("degrades the retired ```dashboard fence to a generic code block (#899-8)", () => {
    const s = sections("```dashboard\nsum:totalVolume{}\n```");
    expect(s).toHaveLength(1);
    expect(s[0].type).toBe("code");
    expect(s[0].language).toBe("dashboard");
  });

  it("does not treat query as a generic code block", () => {
    expect(sections("```query\nx\n```").some(x => x.type === "code")).toBe(false);
  });

  it("sets from/to to cover the entire fenced block", () => {
    const state = EditorState.create({ doc: "```query\nsum:x{}\n```", extensions: [sectionField] });
    const sec = state.field(sectionField).sections[0];
    expect(sec.from).toBe(0);
    expect(sec.to).toBe(state.doc.length);
  });

  it("parses query blocks alongside time blocks and markdown", () => {
    const doc = "# Title\n\n```time\n10:00 Run\n```\n\n```query\nsum:x{}\n```";
    expect(sections(doc).map(x => x.type)).toEqual(["markdown", "markdown", "time", "markdown", "query"]);
  });

  it("tolerates an unclosed query fence (runs to end of doc)", () => {
    const s = sections("lead\n\n```query\nsum:x{}");
    const q = s.find(x => x.type === "query");
    expect(q).toBeDefined();
  });
});
