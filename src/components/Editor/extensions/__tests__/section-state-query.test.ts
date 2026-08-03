/**
 * Query/dashboard fence parsing (#801) — bare ```query and ```dashboard
 * fences are first-class section types (distinct from ```lang code blocks and
 * ```widget:<name> registry blocks), parsed via the shared scanFenced helper.
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

describe("sectionField — query/dashboard fences", () => {
  it("parses ```query into type=query with inner content", () => {
    const doc = "```query\nsum:totalVolume{}\n```";
    const s = sections(doc);
    expect(s).toHaveLength(1);
    expect(s[0].type).toBe("query");
    expect(innerContent(doc).trim()).toBe("sum:totalVolume{}");
  });

  it("parses ```dashboard into type=dashboard", () => {
    const s = sections("```dashboard\nsum:totalVolume{}\n```");
    expect(s).toHaveLength(1);
    expect(s[0].type).toBe("dashboard");
  });

  it("does not treat query/dashboard as generic code blocks", () => {
    expect(sections("```query\nx\n```").some(x => x.type === "code")).toBe(false);
    expect(sections("```dashboard\nx\n```").some(x => x.type === "code")).toBe(false);
  });

  it("sets from/to to cover the entire fenced block", () => {
    const state = EditorState.create({ doc: "```query\nsum:x{}\n```", extensions: [sectionField] });
    const sec = state.field(sectionField).sections[0];
    expect(sec.from).toBe(0);
    expect(sec.to).toBe(state.doc.length);
  });

  it("parses query blocks alongside wod and markdown", () => {
    const doc = "# Title\n\n```time\n10:00 Run\n```\n\n```query\nsum:x{}\n```";
    expect(sections(doc).map(x => x.type)).toEqual(["markdown", "markdown", "wod", "markdown", "query"]);
  });

  it("tolerates an unclosed query fence (runs to end of doc)", () => {
    const s = sections("lead\n\n```query\nsum:x{}");
    const q = s.find(x => x.type === "query");
    expect(q).toBeDefined();
  });
});
