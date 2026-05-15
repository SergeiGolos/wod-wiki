import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MetricType } from "@/core/models/Metric";
import type { ICodeStatement } from "@/core/models/CodeStatement";
import { cursorFocusExtension, getCursorFocusState, renderPanelContent } from "../cursor-focus-panel";
import { sectionField } from "../section-state";
import { sharedParser } from "@/hooks/useRuntimeParser";

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders feedback as a widget anchored to the focused WOD closing fence", () => {
    const view = createView("Intro\n```wod\n10 Pushups\n```", 3);
    const panel = view.contentDOM.querySelector(".cm-wod-metric-panel-anchor .cm-wod-metric-panel");

    expect(panel?.textContent).toContain("Reps");
    expect(panel?.textContent).toContain("Exercise");
    expect(view.dom.querySelector(".cm-panels-bottom .cm-wod-metric-panel")).toBeNull();

    view.destroy();
  });

  it("removes the closing-fence widget when the cursor leaves the WOD section", () => {
    const view = createView("Intro\n```wod\n10 Pushups\n```", 3);

    expect(view.contentDOM.querySelector(".cm-wod-metric-panel-anchor")).not.toBeNull();

    view.dispatch({ selection: { anchor: 0 } });

    expect(getCursorFocusState(view.state)).toBeNull();
    expect(view.contentDOM.querySelector(".cm-wod-metric-panel-anchor")).toBeNull();

    view.destroy();
  });

  it("does not crash when parser returns invalid metric offsets", () => {
    const metric = { type: MetricType.Rep } as any;
    const statement = {
      metrics: [metric],
      metricMeta: new Map([[metric, { startOffset: Number.NaN, endOffset: Number.NaN }]]),
      meta: { line: 1 },
    } as unknown as ICodeStatement;

    vi.spyOn(sharedParser, "read").mockReturnValue({
      statements: [statement],
    } as any);

    const create = () => createView("Intro\n```wod\n10 Pushups\n```", 3);
    expect(create).not.toThrow();

    const view = create();
    expect(getCursorFocusState(view.state)).not.toBeNull();
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
