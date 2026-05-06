/**
 * Tests for widget-block-preview StateField.
 * Verifies that widget fenced blocks produce Decoration.replace decorations.
 */

import { describe, it, expect } from "bun:test";
import { EditorState } from "@codemirror/state";
import { sectionField } from "../section-state";
import { widgetBlockPreview } from "../widget-block-preview";
import type { WidgetRegistry } from "../../overlays/WidgetCompanion";

// A minimal no-op registry for testing
function makeRegistry(): WidgetRegistry {
  return new Map([["test-widget", (() => null) as never]]);
}

function countDecos(state: EditorState, ext: ReturnType<typeof widgetBlockPreview>): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const field = ext as any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoSet = state.field(field) as any;
    let count = 0;
    decoSet.between(0, state.doc.length, () => { count++; });
    return count;
  } catch {
    return -1;
  }
}

describe("widgetBlockPreview — decoration building", () => {
  it("should produce a decoration for a widget block", () => {
    const registry = makeRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Hello\n\n```widget:test-widget\n{}\n```\n\n# Title";
    const state = EditorState.create({ doc, extensions: [sectionField, ext] });
    const count = countDecos(state, ext);
    expect(count).toBeGreaterThan(0);
  });

  it("should produce 0 decorations when no widget blocks are present", () => {
    const registry = makeRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Hello\n\n```wod\n10:00 Run\n```\n\n# Title";
    const state = EditorState.create({ doc, extensions: [sectionField, ext] });
    expect(countDecos(state, ext)).toBe(0);
  });

  it("should skip decoration when cursor is inside widget range", () => {
    const registry = makeRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Hello\n\n```widget:test-widget\n{}\n```\n\n# Title";
    const cursorPos = doc.indexOf("```widget:test-widget") + 5;
    const state = EditorState.create({
      doc,
      extensions: [sectionField, ext],
      selection: { anchor: cursorPos },
    });
    expect(countDecos(state, ext)).toBe(0);
  });
});
