import { describe, it, expect } from "bun:test";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { chapterFocus, parseFocusSpec, setChapterFocus } from "../chapter-focus";

function createView(doc: string): EditorView {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb: FrameRequestCallback): number =>
      setTimeout(() => cb(Date.now()), 16) as unknown as number;
    window.cancelAnimationFrame = (id: number): void => clearTimeout(id);
  }
  const state = EditorState.create({ doc, extensions: [chapterFocus()] });
  return new EditorView({ state, parent: document.body.appendChild(document.createElement("div")) });
}

describe("chapter-focus", () => {
  describe("parseFocusSpec", () => {
    it("parses a range", () => {
      expect(parseFocusSpec("2-4")).toEqual([2, 3, 4]);
    });
    it("parses a single line and a list", () => {
      expect(parseFocusSpec("3")).toEqual([3]);
      expect(parseFocusSpec("2,5")).toEqual([2, 5]);
    });
    it("handles mixed and reversed", () => {
      expect(parseFocusSpec("1, 3-4")).toEqual([1, 3, 4]);
      expect(parseFocusSpec("4-2")).toEqual([2, 3, 4]);
    });
    it("returns null for empty/invalid", () => {
      expect(parseFocusSpec(undefined)).toBeNull();
      expect(parseFocusSpec("")).toBeNull();
      expect(parseFocusSpec("foo")).toBeNull();
    });
  });

  it("marks only the focused lines with the highlight class", () => {
    const doc = "```time\n10 Pushups\n15 Air Squats\n:30 Rest\n```";
    const view = createView(doc);
    setChapterFocus(view, "2-3");
    const focused = view.contentDOM.querySelectorAll(".cm-chapter-focus");
    expect(focused.length).toBe(2);
    expect(focused[0].textContent).toBe("10 Pushups");
    expect(focused[1].textContent).toBe("15 Air Squats");
    view.destroy();
  });

  it("clears the highlight when focus is null", () => {
    const view = createView("a\nb\nc");
    setChapterFocus(view, "1-2");
    expect(view.contentDOM.querySelectorAll(".cm-chapter-focus").length).toBe(2);
    setChapterFocus(view, null);
    expect(view.contentDOM.querySelectorAll(".cm-chapter-focus").length).toBe(0);
    view.destroy();
  });

  it("ignores out-of-range lines instead of throwing", () => {
    const view = createView("a\nb");
    expect(() => setChapterFocus(view, "1-99")).not.toThrow();
    expect(view.contentDOM.querySelectorAll(".cm-chapter-focus").length).toBe(2);
    view.destroy();
  });
});
