import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, it, expect } from "vitest";
import { MetricType } from "@/core/models/Metric";
import type { ICodeStatement } from "@/core/models/CodeStatement";
import { cursorFocusExtension, getCursorFocusState, renderPanelContent } from "../cursor-focus-panel";
import { sectionField } from "../section-state";

function createView(doc: string, selectionLine: number): EditorView {
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

  const state = EditorState.create({
    doc,
    selection: { anchor: EditorState.create({ doc }).doc.line(selectionLine).from },
    extensions: [sectionField, cursorFocusExtension],
  });

  return new EditorView({
    state,
    parent: document.body.appendChild(document.createElement("div")),
  });
}

describe("cursorFocusExtension", () => {
  it("renders feedback in a bottom panel instead of the scrollable document", () => {
    const view = createView("Intro\n```wod\n10 Pushups\n```", 3);
    const panel = view.dom.querySelector(".cm-panels-bottom .cm-wod-metric-panel");

    expect(panel?.textContent).toContain("Reps");
    expect(panel?.textContent).toContain("Exercise");
    expect(view.contentDOM.querySelector(".cm-wod-metric-panel")).toBeNull();

    view.destroy();
  });

  it("hides the bottom panel when the cursor leaves the WOD section", () => {
    const view = createView("Intro\n```wod\n10 Pushups\n```", 3);
    const host = view.dom.querySelector<HTMLElement>(".cm-wod-metric-panel-host");

    expect(host?.style.display).toBe("");

    view.dispatch({ selection: { anchor: 0 } });

    expect(getCursorFocusState(view.state)).toBeNull();
    expect(host?.style.display).toBe("none");
    expect(host?.querySelector(".cm-wod-metric-panel")).toBeNull();

    view.destroy();
  });

  it("renders the same focused metric hint content", () => {
    const statement = {
      metrics: [
        { type: MetricType.Duration },
        { type: MetricType.Effort },
      ],
    } as unknown as ICodeStatement;

    const panel = renderPanelContent(statement, MetricType.Duration);

    expect(panel.querySelector(".cm-wod-metric-panel__label-item--focused")?.textContent).toBe("Timer");
    expect(panel.querySelector(".cm-wod-metric-panel__hint")?.textContent).toBe("Ctrl+↑↓ · adjust");
  });
});
