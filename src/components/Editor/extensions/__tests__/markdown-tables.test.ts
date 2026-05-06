import { describe, expect, it } from "bun:test";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { markdownTablePreview } from "../markdown-tables";
import { sectionField } from "../section-state";

function createView(doc: string, selectionLine = 1): EditorView {
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
    extensions: [markdown(), sectionField, markdownTablePreview],
  });

  return new EditorView({
    state,
    parent: document.body.appendChild(document.createElement("div")),
  });
}

describe("markdownTablePreview", () => {
  it("renders inline markdown inside table cells", () => {
    const view = createView([
      "Intro",
      "",
      "| Metric | Details |",
      "| --- | --- |",
      "| **Load** | [RX](/collections/rx) with `95lb`, *fast*, and ~~scaled~~ |",
    ].join("\n"));

    const table = view.dom.querySelector(".cm-md-table");
    expect(table).toBeTruthy();

    expect(table?.querySelector("strong")?.textContent).toBe("Load");
    expect(table?.querySelector("a")?.textContent).toBe("RX");
    expect(table?.querySelector("a")?.getAttribute("href")).toBe("/collections/rx");
    expect(table?.querySelector("code")?.textContent).toBe("95lb");
    expect(table?.querySelector("em")?.textContent).toBe("fast");
    expect(table?.querySelector("s")?.textContent).toBe("scaled");
    expect(table?.textContent).not.toContain("**Load**");
    expect(table?.textContent).not.toContain("[RX](/collections/rx)");

    view.destroy();
    document.body.innerHTML = "";
  });

  it("does not render unsafe table cell links as anchors", () => {
    const view = createView([
      "Intro",
      "",
      "| Name | Link |",
      "| --- | --- |",
      "| Demo | [bad](javascript:alert(1)) |",
    ].join("\n"));

    const table = view.dom.querySelector(".cm-md-table");
    expect(table?.querySelector("a")).toBeNull();
    expect(table?.textContent).toContain("bad");
    expect(table?.textContent).not.toContain("javascript:alert(1)");

    view.destroy();
    document.body.innerHTML = "";
  });
});
