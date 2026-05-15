/**
 * Tests for widget-block-preview StateField.
 * Verifies that widget fenced blocks produce Decoration.replace decorations.
 */

import { describe, it, expect } from "bun:test";
import React from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, runScopeHandlers } from "@codemirror/view";
import { sectionField } from "../section-state";
import { previewDecorations } from "../preview-decorations";
import { widgetBlockPreview } from "../widget-block-preview";
import type { WidgetRegistry, WidgetProps } from "../../overlays/WidgetCompanion";

// A minimal no-op registry for testing
function makeRegistry(): WidgetRegistry {
  return new Map([["test-widget", (() => null) as never]]);
}

function countDecos(state: EditorState, ext: ReturnType<typeof widgetBlockPreview>): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const field = (Array.isArray(ext) ? ext[0] : ext) as any;
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

function ensureAnimationFrame(): void {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      return setTimeout(() => callback(Date.now()), 16) as unknown as number;
    };
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id: number): void => {
      clearTimeout(id);
    };
  }
}

function createView(
  doc: string,
  selectionLine: number,
  extensions: unknown[],
  selectionColumn = 0,
): EditorView {
  ensureAnimationFrame();
  const probe = EditorState.create({ doc });
  const selectionLineRef = probe.doc.line(selectionLine);
  const selectionPos = selectionLineRef.from + Math.min(selectionColumn, selectionLineRef.length);
  const state = EditorState.create({
    doc,
    selection: { anchor: selectionPos },
    extensions,
  });

  return new EditorView({
    state,
    parent: document.body.appendChild(document.createElement("div")),
  });
}

function pressArrow(view: EditorView, key: "ArrowDown" | "ArrowUp"): boolean {
  return runScopeHandlers(view, new KeyboardEvent("keydown", { key }), "editor");
}

async function flushWidgetRender(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
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

  it("should pass parsed JSON config to the registered widget component", async () => {
    const registry: WidgetRegistry = new Map([
      [
        "test-widget",
        (({ config }: WidgetProps) =>
          React.createElement("div", { "data-testid": "widget-config" }, String(config.title ?? "missing"))) as never,
      ],
    ]);
    const ext = widgetBlockPreview(registry);
    const doc = "Lead\n\n```widget:test-widget\n{\"title\":\"Config Demo\"}\n```\n\nTail";
    const view = createView(doc, 1, [sectionField, ext]);

    await flushWidgetRender();

    const mounted = document.querySelector('[data-testid="widget-config"]');
    expect(mounted?.textContent).toBe("Config Demo");

    view.destroy();
    document.body.innerHTML = "";
  });

  it("should reveal a widget block when ArrowDown moves onto it", () => {
    const registry = makeRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "# Intro\n  lead\n```widget:test-widget\n{}\n```\n\n# Title";
    const view = createView(doc, 2, [sectionField, ext], 2);

    expect(pressArrow(view, "ArrowDown")).toBe(true);
    expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(3);
    expect(view.state.selection.main.head).toBe(view.state.doc.line(3).from + 2);
    expect(countDecos(view.state, ext)).toBe(0);

    view.destroy();
    document.body.innerHTML = "";
  });

  it("should reveal a widget block when ArrowUp moves onto it from below", () => {
    const registry = makeRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "# Intro\n\n```widget:test-widget\n{}\n```\n# Title";
    const view = createView(doc, 6, [sectionField, ext], 4);

    expect(pressArrow(view, "ArrowUp")).toBe(true);
    expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(5);
    expect(view.state.selection.main.head).toBe(view.state.doc.line(5).to);
    expect(countDecos(view.state, ext)).toBe(0);

    view.destroy();
    document.body.innerHTML = "";
  });

  it("should let normal ArrowDown handling run after the widget source is revealed", () => {
    const registry = makeRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "# Intro\n\n```widget:test-widget\n{\"title\":\"Demo\"}\n```\n\n# Title";
    const view = createView(doc, 2, [sectionField, ext]);

    expect(pressArrow(view, "ArrowDown")).toBe(true);
    expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(3);
    expect(pressArrow(view, "ArrowDown")).toBe(false);

    view.destroy();
    document.body.innerHTML = "";
  });

  it("should leave WOD blocks to normal ArrowDown movement", () => {
    const doc = "# Intro\n\n```wod\n10:00 Run\n```\n\n# Title";
    const view = createView(doc, 2, [sectionField, previewDecorations]);

    expect(pressArrow(view, "ArrowDown")).toBe(false);
    expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(2);

    view.destroy();
    document.body.innerHTML = "";
  });
});
