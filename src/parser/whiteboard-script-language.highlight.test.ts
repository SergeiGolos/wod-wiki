import { describe, it, expect, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { whiteboardScriptLanguage } from "@/hooks/useRuntimeParser";

describe("whiteboardScriptLanguage highlight interop", () => {
  it("does not crash CodeMirror highlight plugin for wod fences", () => {
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

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const state = EditorState.create({
      doc: "```wod\n10 Pushups\n```",
      extensions: [
        markdown({
          codeLanguages: (info) =>
            info === "wod" || info === "log" || info === "plan"
              ? whiteboardScriptLanguage
              : null,
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: document.body.appendChild(document.createElement("div")),
    });

    const pluginCrashes = consoleError.mock.calls
      .map((call) => call.map(String).join(" "))
      .filter((line) => /CodeMirror plugin crashed|HighlightStyle|tags3 is not iterable/i.test(line));

    expect(pluginCrashes).toHaveLength(0);

    view.destroy();
    consoleError.mockRestore();
  });
});
