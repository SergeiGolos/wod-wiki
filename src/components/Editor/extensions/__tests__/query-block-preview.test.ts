/**
 * query-block-preview decoration tests (#801, #842) — verifies ```query and
 * ```dashboard fenced blocks produce Decoration.replace decorations and test
 * saveBlockQuerySource patching back into CM6 editor document state.
 */
import { describe, expect, it } from "bun:test";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { sectionField } from "../section-state";
import {
  queryBlockPreview,
  saveBlockQuerySource,
} from "../query-block-preview";

function countDecos(state: EditorState, ext: ReturnType<typeof queryBlockPreview>): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const field = (Array.isArray(ext) ? ext[0] : ext) as any;
  const decoSet = state.field(field) as any;
  let count = 0;
  decoSet.between(0, state.doc.length, () => { count++; });
  return count;
}

function createView(doc: string, ext = queryBlockPreview()): EditorView {
  if (typeof window !== "undefined" && !window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      callback(Date.now());
      return 1;
    };
  }
  const state = EditorState.create({ doc, extensions: [sectionField, ext] });
  const container = typeof document !== "undefined" ? document.body.appendChild(document.createElement("div")) : undefined;
  return new EditorView({
    state,
    parent: container,
  });
}

describe("queryBlockPreview — decoration building", () => {
  it("produces a decoration for a ```query block", () => {
    const ext = queryBlockPreview();
    const doc = "Lead\n\n```query\nsum:totalVolume{}\n```\n\nTail";
    const state = EditorState.create({ doc, extensions: [sectionField, ext] });
    expect(countDecos(state, ext)).toBe(1);
  });

  it("produces a decoration for a ```dashboard block", () => {
    const ext = queryBlockPreview();
    const doc = "Lead\n\n```dashboard\nsum:totalVolume{}\nfind:note{tags:pr}\n```\n\nTail";
    const state = EditorState.create({ doc, extensions: [sectionField, ext] });
    expect(countDecos(state, ext)).toBe(1);
  });

  it("produces one decoration per query block", () => {
    const ext = queryBlockPreview();
    const doc = "# Note\n\n```query\nsum:a{}\n```\n\n```query\nsum:b{}\n```";
    const state = EditorState.create({ doc, extensions: [sectionField, ext] });
    expect(countDecos(state, ext)).toBe(2);
  });

  it("does not decorate time or code blocks", () => {
    const ext = queryBlockPreview();
    const doc = "# Title\n\n```time\n10:00 Run\n```\n\n```js\nx\n```";
    const state = EditorState.create({ doc, extensions: [sectionField, ext] });
    expect(countDecos(state, ext)).toBe(0);
  });

  it("reveals source (no decoration) when the cursor is inside the query block", () => {
    const ext = queryBlockPreview();
    const doc = "Lead\n\n```query\nsum:totalVolume{}\n```\n\nTail";
    const cursorPos = doc.indexOf("sum:totalVolume");
    const state = EditorState.create({
      doc,
      extensions: [sectionField, ext],
      selection: { anchor: cursorPos },
    });
    expect(countDecos(state, ext)).toBe(0);
  });
});

describe("saveBlockQuerySource — CM6 document patching", () => {
  it("patches a query block content in place inside CM6 EditorView", () => {
    const doc = "Lead\n\n```query\nsum:totalVolume{discipline:strength}\n```\n\nTail";
    const view = createView(doc);

    const section = view.state.field(sectionField).sections.find((s) => s.type === "query");
    expect(section).toBeDefined();

    const res = saveBlockQuerySource(view, section!.id, "avg:totalVolume{discipline:strength}");
    expect(res.ok).toBe(true);
    expect(view.state.doc.toString()).toBe(
      "Lead\n\n```query\navg:totalVolume{discipline:strength}\n```\n\nTail",
    );
  });

  it("patches YAML query block preserving sibling keys", () => {
    const doc = "Lead\n\n```query\ntitle: Volume\nquery: sum:totalVolume{}\nchart: bars\n```\n\nTail";
    const view = createView(doc);

    const section = view.state.field(sectionField).sections.find((s) => s.type === "query");
    expect(section).toBeDefined();

    const res = saveBlockQuerySource(view, section!.id, "avg:totalVolume{}");
    expect(res.ok).toBe(true);
    expect(view.state.doc.toString()).toBe(
      "Lead\n\n```query\ntitle: Volume\nquery: avg:totalVolume{}\nchart: bars\n```\n\nTail",
    );
  });

  it("patches specific query index in a dashboard block", () => {
    const doc = "Lead\n\n```dashboard\n# Header\nsum:totalVolume{}\nfind:note{tags:pr}\n```\n\nTail";
    const view = createView(doc);

    const section = view.state.field(sectionField).sections.find((s) => s.type === "dashboard");
    expect(section).toBeDefined();

    const res = saveBlockQuerySource(view, section!.id, "find:note{tags:workout}", 1);
    expect(res.ok).toBe(true);
    expect(view.state.doc.toString()).toBe(
      "Lead\n\n```dashboard\n# Header\nsum:totalVolume{}\nfind:note{tags:workout}\n```\n\nTail",
    );
  });
});
