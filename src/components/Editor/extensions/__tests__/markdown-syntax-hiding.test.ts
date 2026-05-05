import { describe, it, expect } from "bun:test";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { markdownSyntaxHiding } from "../markdown-syntax-hiding";
import { sectionField } from "../section-state";
import { urlAtPos } from "../link-open";

function createView(doc: string, selectionLine: number, extensions: unknown[] = []): EditorView {
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

  const probe = EditorState.create({ doc });
  const state = EditorState.create({
    doc,
    selection: { anchor: probe.doc.line(selectionLine).from },
    extensions: [markdown(), sectionField, ...extensions],
  });

  return new EditorView({
    state,
    parent: document.body.appendChild(document.createElement("div")),
  });
}

describe("markdownSyntaxHiding", () => {
  it("folds inline markdown links when the cursor is on another line", () => {
    const view = createView(
      "Intro\nSee [crossfit-girls](/collections/crossfit-girls)",
      1,
      [markdownSyntaxHiding()],
    );

    const text = view.contentDOM.textContent ?? "";

    expect(text).toContain("See crossfit-girls");
    expect(text).not.toContain("[crossfit-girls](/collections/crossfit-girls)");
    expect(text).not.toContain("/collections/crossfit-girls");

    view.destroy();
  });

  it("keeps raw markdown link syntax visible on the active line", () => {
    const view = createView(
      "Intro\nSee [crossfit-girls](/collections/crossfit-girls)",
      2,
      [markdownSyntaxHiding()],
    );

    const text = view.contentDOM.textContent ?? "";

    expect(text).toContain("[crossfit-girls](/collections/crossfit-girls)");

    view.destroy();
  });
});

describe("urlAtPos", () => {
  it("resolves app-relative markdown routes from the visible label", () => {
    const doc = "See [crossfit-girls](/collections/crossfit-girls)";
    const view = createView(doc, 1);
    const pos = doc.indexOf("crossfit-girls") + 1;

    expect(urlAtPos(view, pos)).toBe("/collections/crossfit-girls");

    view.destroy();
  });
});