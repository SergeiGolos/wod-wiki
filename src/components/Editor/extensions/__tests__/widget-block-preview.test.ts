/**
 * Tests for widget-block-preview StateField.
 * Verifies that widget fenced blocks produce Decoration.replace decorations.
 */

import { afterEach, describe, expect, it } from "bun:test";
import React from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, runScopeHandlers } from "@codemirror/view";
import { fireEvent } from "@testing-library/react";

import { sectionField } from "../section-state";
import { previewDecorations } from "../preview-decorations";
import { widgetBlockPreview } from "../widget-block-preview";
import type { WidgetRegistry, WidgetProps } from "../../widgets/types";

function makeRegistry(): WidgetRegistry {
  return new Map([["test-widget", (() => null) as never]]);
}

function makeInteractiveRegistry(): WidgetRegistry {
  return new Map([
    [
      "test-widget",
      (({ config }: WidgetProps) =>
        React.createElement(
          "div",
          { "data-testid": "widget-config" },
          String(config.title ?? "missing"),
        )) as never,
    ],
  ]);
}

function countDecos(state: EditorState, ext: ReturnType<typeof widgetBlockPreview>): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const field = (Array.isArray(ext) ? ext[0] : ext) as any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoSet = state.field(field) as any;
    let count = 0;
    decoSet.between(0, state.doc.length, () => {
      count++;
    });
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
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function cleanupDom(): void {
  document.body.innerHTML = "";
}

afterEach(() => {
  cleanupDom();
})

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
    const registry = makeInteractiveRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Lead\n\n```widget:test-widget\n{\"title\":\"Config Demo\"}\n```\n\nTail";
    const view = createView(doc, 1, [sectionField, ext]);

    await flushWidgetRender();

    const mounted = document.querySelector('[data-testid="widget-config"]');
    expect(mounted?.textContent).toBe("Config Demo");

    view.destroy();
  });

  it("should render an edit button that becomes visible on focus", async () => {
    const registry = makeInteractiveRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Lead\n\n```widget:test-widget\n{\"title\":\"Focus Demo\"}\n```\n\nTail";
    const view = createView(doc, 1, [sectionField, ext]);

    await flushWidgetRender();

    const button = document.querySelector('[aria-label="Edit widget"]') as HTMLButtonElement | null;
    expect(button).toBeTruthy();
    expect(button?.className).toContain("opacity-0");

    button?.focus();
    fireEvent.focus(button as HTMLButtonElement);
    await flushWidgetRender();

    const focusedButton = document.querySelector('[aria-label="Edit widget"]') as HTMLButtonElement | null;
    expect(focusedButton?.className).toContain("opacity-100");

    view.destroy();
  });

  it("should enter edit mode when the edit button is clicked", async () => {
    const registry = makeInteractiveRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Lead\n\n```widget:test-widget\n{\"title\":\"Editable\"}\n```\n\nTail";
    const view = createView(doc, 1, [sectionField, ext]);

    await flushWidgetRender();

    const button = document.querySelector('[aria-label="Edit widget"]') as HTMLButtonElement;
    fireEvent.click(button);
    await flushWidgetRender();

    const textarea = document.querySelector('[data-testid="widget-markdown-editor"]');
    const saveButton = document.querySelector('[aria-label="Save widget"]');
    expect(textarea).toBeTruthy();
    expect(saveButton).toBeTruthy();

    view.destroy();
  });

  it("should save valid JSON and return to preview mode", async () => {
    const registry = makeInteractiveRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Lead\n\n```widget:test-widget\n{\"title\":\"Original\"}\n```\n\nTail";
    const view = createView(doc, 1, [sectionField, ext]);

    await flushWidgetRender();

    fireEvent.click(document.querySelector('[aria-label="Edit widget"]') as HTMLButtonElement);
    await flushWidgetRender();

    const textarea = document.querySelector('[data-testid="widget-markdown-editor"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '{"title":"Saved"}' } });
    fireEvent.click(document.querySelector('[aria-label="Save widget"]') as HTMLButtonElement);
    await flushWidgetRender();

    expect(view.state.doc.toString()).toContain('{"title":"Saved"}');
    expect(document.querySelector('[data-testid="widget-markdown-editor"]')).toBeNull();
    expect(document.querySelector('[data-testid="widget-config"]')?.textContent).toBe("Saved");

    view.destroy();
  });

  it("should auto-save valid JSON on blur", async () => {
    const registry = makeInteractiveRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Lead\n\n```widget:test-widget\n{\"title\":\"Original\"}\n```\n\nTail";
    const view = createView(doc, 1, [sectionField, ext]);

    await flushWidgetRender();

    fireEvent.click(document.querySelector('[aria-label="Edit widget"]') as HTMLButtonElement);
    await flushWidgetRender();

    const textarea = document.querySelector('[data-testid="widget-markdown-editor"]') as HTMLTextAreaElement;
    const outside = document.body.appendChild(document.createElement("button"));
    fireEvent.change(textarea, { target: { value: '{"title":"Blur Save"}' } });
    fireEvent.blur(textarea, { relatedTarget: outside });
    await flushWidgetRender();

    expect(view.state.doc.toString()).toContain('{"title":"Blur Save"}');
    expect(document.querySelector('[data-testid="widget-markdown-editor"]')).toBeNull();
    expect(document.querySelector('[data-testid="widget-config"]')?.textContent).toBe("Blur Save");

    view.destroy();
  });

  it("should show an error inlay and keep edit mode on invalid blur", async () => {
    const registry = makeInteractiveRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Lead\n\n```widget:test-widget\n{\"title\":\"Original\"}\n```\n\nTail";
    const view = createView(doc, 1, [sectionField, ext]);

    await flushWidgetRender();

    fireEvent.click(document.querySelector('[aria-label="Edit widget"]') as HTMLButtonElement);
    await flushWidgetRender();

    const textarea = document.querySelector('[data-testid="widget-markdown-editor"]') as HTMLTextAreaElement;
    const outside = document.body.appendChild(document.createElement("button"));
    fireEvent.change(textarea, { target: { value: '{"title":' } });
    fireEvent.blur(textarea, { relatedTarget: outside });
    await flushWidgetRender();

    expect(view.state.doc.toString()).toContain('{"title":"Original"}');
    expect(document.querySelector('[data-testid="widget-error-inlay"]')?.textContent).toContain("JSON");
    expect(document.querySelector('[aria-label="Undo changes"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="widget-markdown-editor"]')).toBeTruthy();

    view.destroy();
  });

  it("should undo invalid edits and restore the last saved preview", async () => {
    const registry = makeInteractiveRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Lead\n\n```widget:test-widget\n{\"title\":\"Original\"}\n```\n\nTail";
    const view = createView(doc, 1, [sectionField, ext]);

    await flushWidgetRender();

    fireEvent.click(document.querySelector('[aria-label="Edit widget"]') as HTMLButtonElement);
    await flushWidgetRender();

    const textarea = document.querySelector('[data-testid="widget-markdown-editor"]') as HTMLTextAreaElement;
    const outside = document.body.appendChild(document.createElement("button"));
    fireEvent.change(textarea, { target: { value: '{"title":' } });
    fireEvent.blur(textarea, { relatedTarget: outside });
    await flushWidgetRender();

    fireEvent.click(document.querySelector('[aria-label="Undo changes"]') as HTMLButtonElement);
    await flushWidgetRender();

    expect(document.querySelector('[data-testid="widget-markdown-editor"]')).toBeNull();
    expect(document.querySelector('[data-testid="widget-error-inlay"]')).toBeNull();
    expect(document.querySelector('[data-testid="widget-config"]')?.textContent).toBe("Original");
    expect(view.state.doc.toString()).toContain('{"title":"Original"}');

    view.destroy();
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
  });

  it("should leave WOD blocks to normal ArrowDown movement", () => {
    const doc = "# Intro\n\n```wod\n10:00 Run\n```\n\n# Title";
    const view = createView(doc, 2, [sectionField, previewDecorations]);

    expect(pressArrow(view, "ArrowDown")).toBe(false);
    expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(2);

    view.destroy();
  });

  it("should enter edit mode when Enter is pressed on a focused preview", async () => {
    const registry = makeInteractiveRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Lead\n\n```widget:test-widget\n{\"title\":\"Focus Demo\"}\n```\n\nTail";
    const view = createView(doc, 1, [sectionField, ext]);

    await flushWidgetRender();

    const previewSurface = document.querySelector('[data-testid="widget-preview-surface"]') as HTMLDivElement;
    expect(previewSurface).toBeTruthy();

    fireEvent.keyDown(previewSurface, { key: "Enter", bubbles: true });
    await flushWidgetRender();

    const textarea = document.querySelector('[data-testid="widget-markdown-editor"]');
    expect(textarea).toBeTruthy();

    view.destroy();
  });

  it("should discard changes and exit edit mode when Escape is pressed in the textarea", async () => {
    const registry = makeInteractiveRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Lead\n\n```widget:test-widget\n{\"title\":\"Original\"}\n```\n\nTail";
    const view = createView(doc, 1, [sectionField, ext]);

    await flushWidgetRender();

    fireEvent.click(document.querySelector('[aria-label="Edit widget"]') as HTMLButtonElement);
    await flushWidgetRender();

    const textarea = document.querySelector('[data-testid="widget-markdown-editor"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '{\"title\":\"Changed\"}' } });
    await flushWidgetRender();

    fireEvent.keyDown(textarea, { key: "Escape", bubbles: true });
    await flushWidgetRender();

    expect(document.querySelector('[data-testid="widget-markdown-editor"]')).toBeNull();
    expect(document.querySelector('[data-testid="widget-config"]')?.textContent).toBe("Original");
    expect(view.state.doc.toString()).toContain('{"title":"Original"}');

    view.destroy();
  });

  it("should save and exit edit mode when Ctrl+Enter is pressed in the textarea", async () => {
    const registry = makeInteractiveRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Lead\n\n```widget:test-widget\n{\"title\":\"Original\"}\n```\n\nTail";
    const view = createView(doc, 1, [sectionField, ext]);

    await flushWidgetRender();

    fireEvent.click(document.querySelector('[aria-label="Edit widget"]') as HTMLButtonElement);
    await flushWidgetRender();

    const textarea = document.querySelector('[data-testid="widget-markdown-editor"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '{\"title\":\"CtrlSaved\"}' } });
    await flushWidgetRender();

    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true, bubbles: true });
    await flushWidgetRender();

    expect(document.querySelector('[data-testid="widget-markdown-editor"]')).toBeNull();
    expect(document.querySelector('[data-testid="widget-config"]')?.textContent).toBe("CtrlSaved");
    expect(view.state.doc.toString()).toContain('{"title":"CtrlSaved"}');

    view.destroy();
  });

  it("should auto-save the first widget when focus moves to edit a second widget", async () => {
    const registry = makeInteractiveRegistry();
    const ext = widgetBlockPreview(registry);
    const doc = "Lead\n\n```widget:test-widget\n{\"title\":\"First\"}\n```\n\n```widget:test-widget\n{\"title\":\"Second\"}\n```\n\nTail";
    const view = createView(doc, 1, [sectionField, ext]);

    await flushWidgetRender();

    // Enter edit mode on the first widget
    const firstEditButton = document.querySelectorAll('[aria-label="Edit widget"]')[0] as HTMLButtonElement;
    fireEvent.click(firstEditButton);
    await flushWidgetRender();

    const textarea = document.querySelector('[data-testid="widget-markdown-editor"]') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    fireEvent.change(textarea, { target: { value: '{\"title\":\"FirstEdited\"}' } });
    await flushWidgetRender();

    // Blur to an outside element (simulating focus moving to the second widget)
    const outside = document.body.appendChild(document.createElement("button"));
    fireEvent.blur(textarea, { relatedTarget: outside });
    await flushWidgetRender();

    expect(view.state.doc.toString()).toContain('{"title":"FirstEdited"}');
    expect(document.querySelector('[data-testid="widget-markdown-editor"]')).toBeNull();

    view.destroy();
  });
});
