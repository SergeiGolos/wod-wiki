/**
 * query-block-preview decoration tests (#801) — verifies ```query and
 * ```dashboard fenced blocks produce Decoration.replace decorations, mirroring
 * the widget-block-preview.test.ts seam. The cursor-reveal-source rule
 * suppresses a block when the cursor sits inside it, so each doc wraps the
 * block in surrounding prose (cursor defaults to position 0).
 */
import { describe, expect, it } from "bun:test";
import { EditorState } from "@codemirror/state";
import { sectionField } from "../section-state";
import { queryBlockPreview } from "../query-block-preview";

function countDecos(state: EditorState, ext: ReturnType<typeof queryBlockPreview>): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const field = (Array.isArray(ext) ? ext[0] : ext) as any;
  const decoSet = state.field(field) as any;
  let count = 0;
  decoSet.between(0, state.doc.length, () => { count++; });
  return count;
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

  it("does not decorate wod or code blocks", () => {
    const ext = queryBlockPreview();
    const doc = "# Title\n\n```wod\n10:00 Run\n```\n\n```js\nx\n```";
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
