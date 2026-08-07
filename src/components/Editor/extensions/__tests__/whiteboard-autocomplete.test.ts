/**
 * Tests for the fence autocomplete & wrapping bindings (#892).
 *
 * Contracts defended:
 *  - Typing ``` in a markdown section offers time / log / query / dashboard.
 *  - The dropdown does not fire inside time, log, query, dashboard, code,
 *    or widget sections (fence precedence is preserved).
 *  - Applying a completion inserts the chosen fence with the cursor inside.
 *  - Auto-wrap (selection + typing `) and the smart-wrap command both emit
 *    a ```time fence with the cursor on the content line.
 */

import { describe, it, expect } from "bun:test";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { CompletionContext } from "@codemirror/autocomplete";
import type { Completion } from "@codemirror/autocomplete";
import { sectionField } from "../section-state";
import {
  fenceCompletion,
  wrapInTimeFence,
  handleFenceAutoWrap,
} from "../whiteboard-autocomplete";

function createState(doc: string, cursor = doc.length) {
  return EditorState.create({
    doc,
    selection: { anchor: cursor },
    extensions: [sectionField],
  });
}

function createView(doc: string, from: number, to = from): EditorView {
  // jsdom lacks rAF. This mirrors the sibling-test convention
  // (markdown-tables.test.ts et al.): install-if-missing and never remove —
  // the window global is shared across every test file in the process, and
  // async CM measure passes from other files crash if it disappears. A real
  // 16ms timer is required here: CM must actually run its measure pass, so a
  // no-op/fake-timer rAF breaks views in sibling files (widget-block-preview).
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
  return new EditorView({
    state: createState(doc).update({
      selection: { anchor: from, head: to },
    }).state,
    parent: document.body.appendChild(document.createElement("div")),
  });
}

function fenceOptions(doc: string, cursor = doc.length) {
  const state = createState(doc, cursor);
  const ctx = new CompletionContext(state, cursor, true);
  return fenceCompletion(ctx);
}

// ── ``` completion dropdown ──────────────────────────────────────────

describe("fenceCompletion — offered set", () => {
  it("offers time, log, and query fences when typing ```", () => {
    const result = fenceOptions("```");
    expect(result).not.toBeNull();
    const labels = result!.options.map((o) => o.label);
    expect(labels).toEqual(["```time", "```log", "```query", "```query:timeseries"]);
  });

  it("triggers on a single backtick too", () => {
    const result = fenceOptions("`");
    expect(result).not.toBeNull();
    expect(result!.options.map((o) => o.label)).toContain("```time");
  });

  it("ranks time first, then log, then the content blocks", () => {
    const result = fenceOptions("```");
    const boosts = result!.options.map((o) => o.boost ?? 0);
    expect(boosts).toEqual([...boosts].sort((a, b) => b - a));
    expect(result!.options[0].label).toBe("```time");
    expect(result!.options[1].label).toBe("```log");
  });

  it("does not offer removed tags (wod, plan, whiteboard, dashboard)", () => {
    const result = fenceOptions("```");
    const labels = result!.options.map((o) => o.label);
    expect(labels).not.toContain("```wod");
    expect(labels).not.toContain("```plan");
    expect(labels).not.toContain("```whiteboard");
    expect(labels).not.toContain("```dashboard");
  });
});

describe("fenceCompletion — section gating", () => {
  it("does not fire inside a time section", () => {
    expect(fenceOptions("```time\n10 burpees\n``")).toBeNull();
  });

  it("does not fire inside a log section", () => {
    expect(fenceOptions("```log\n10 burpees\n``")).toBeNull();
  });

  it("does not fire inside a query block", () => {
    expect(fenceOptions("```query\nSELECT *\n``")).toBeNull();
  });

  it("does not fire inside a retired dashboard fence (now generic code)", () => {
    expect(fenceOptions("```dashboard\n``")).toBeNull();
  });

  it("does not fire inside a widget fence", () => {
    expect(fenceOptions("```widget:hero\n{}\n``")).toBeNull();
  });

  it("does not fire inside a generic code fence", () => {
    expect(fenceOptions("```js\nconst x = 1;\n``")).toBeNull();
  });

  it("fires in plain markdown after a closed time block", () => {
    const doc = "```time\n10 burpees\n```\n\n``";
    expect(fenceOptions(doc)).not.toBeNull();
  });
});

describe("fenceCompletion — apply", () => {
  /** Narrow Completion.apply to its function form and invoke it. */
  function applyOption(
    view: EditorView,
    completion: Completion,
    from: number,
    to: number,
  ) {
    const { apply } = completion;
    if (typeof apply !== "function") throw new Error("expected function apply");
    apply(view, completion, from, to);
  }

  it("inserts a time fence with the cursor inside", () => {
    const view = createView("```", 3);
    const result = fenceOptions("```")!;
    applyOption(view, result.options[0], result.from, 3);
    expect(view.state.doc.toString()).toBe("```time\n\n```");
    expect(view.state.selection.main.head).toBe("```time\n".length);
    view.destroy();
  });

  it("inserts a query fence when the query option is applied", () => {
    const view = createView("```", 3);
    const result = fenceOptions("```")!;
    const completion = result.options.find((o) => o.label === "```query")!;
    applyOption(view, completion, result.from, 3);
    expect(view.state.doc.toString()).toBe("```query\n\n```");
    expect(view.state.selection.main.head).toBe("```query\n".length);
    view.destroy();
  });
});

// ── Smart-wrap command (Cmd+Shift+W) ─────────────────────────────────

describe("wrapInTimeFence — smart wrap", () => {
  it("wraps the selection in a ```time fence", () => {
    const view = createView("10 burpees", 0, 10);
    expect(wrapInTimeFence(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("```time\n10 burpees\n```");
    // Cursor lands at the start of the wrapped content
    expect(view.state.selection.main.head).toBe("```time\n".length);
    view.destroy();
  });

  it("inserts an empty ```time fence when there is no selection", () => {
    const view = createView("", 0);
    expect(wrapInTimeFence(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("```time\n\n```");
    expect(view.state.selection.main.head).toBe("```time\n".length);
    view.destroy();
  });
});

// ── Auto-wrap (selection + typing `) ─────────────────────────────────

function fakeBacktickEvent(data: string | null, inputType = "insertText") {
  let prevented = false;
  return {
    event: {
      inputType,
      data,
      preventDefault: () => {
        prevented = true;
      },
    },
    wasPrevented: () => prevented,
  };
}

describe("handleFenceAutoWrap — auto wrap", () => {
  it("wraps the selection in a ```time fence when ` is typed", () => {
    const view = createView("10 burpees", 0, 10);
    const { event, wasPrevented } = fakeBacktickEvent("`");
    expect(handleFenceAutoWrap(event as InputEvent, view)).toBe(true);
    expect(wasPrevented()).toBe(true);
    expect(view.state.doc.toString()).toBe("```time\n10 burpees\n```");
    view.destroy();
  });

  it("ignores backticks when there is no selection", () => {
    const view = createView("abc", 1);
    const { event, wasPrevented } = fakeBacktickEvent("`");
    expect(handleFenceAutoWrap(event as InputEvent, view)).toBe(false);
    expect(wasPrevented()).toBe(false);
    expect(view.state.doc.toString()).toBe("abc");
    view.destroy();
  });

  it("ignores non-backtick input", () => {
    const view = createView("abc", 0, 3);
    const { event } = fakeBacktickEvent("x");
    expect(handleFenceAutoWrap(event as InputEvent, view)).toBe(false);
    expect(view.state.doc.toString()).toBe("abc");
    view.destroy();
  });

  it("ignores non-typing input events", () => {
    const view = createView("abc", 0, 3);
    const { event } = fakeBacktickEvent("`", "insertFromPaste");
    expect(handleFenceAutoWrap(event as InputEvent, view)).toBe(false);
    view.destroy();
  });

  it("does not nest fences inside a time section", () => {
    const doc = "```time\n10 burpees\n```";
    const view = createView(doc, 8, 18); // select "10 burpees" inside the block
    const { event, wasPrevented } = fakeBacktickEvent("`");
    expect(handleFenceAutoWrap(event as InputEvent, view)).toBe(false);
    expect(wasPrevented()).toBe(false);
    expect(view.state.doc.toString()).toBe(doc);
    view.destroy();
  });

  it("rejects a selection that crosses from markdown into a fence", () => {
    const doc = "some notes\n\n```time\n10 burpees\n```";
    // Backwards selection: head in markdown (pos 0), range reaches the block
    const view = createView(doc, 25, 0);
    const { event, wasPrevented } = fakeBacktickEvent("`");
    expect(handleFenceAutoWrap(event as InputEvent, view)).toBe(false);
    expect(wasPrevented()).toBe(false);
    expect(view.state.doc.toString()).toBe(doc);
    view.destroy();
  });

  it("rejects a selection anchored in a fence even when the head is markdown", () => {
    const doc = "```time\n10 burpees\n```\n\ntrailing notes";
    // Head in trailing markdown (pos 30), anchor inside the time block
    const view = createView(doc, 15, 30);
    const { event, wasPrevented } = fakeBacktickEvent("`");
    expect(handleFenceAutoWrap(event as InputEvent, view)).toBe(false);
    expect(wasPrevented()).toBe(false);
    expect(view.state.doc.toString()).toBe(doc);
    view.destroy();
  });

  it("wraps a multi-paragraph markdown selection", () => {
    const doc = "10 burpees\n\n20 squats";
    const view = createView(doc, 0, doc.length);
    const { event } = fakeBacktickEvent("`");
    expect(handleFenceAutoWrap(event as InputEvent, view)).toBe(true);
    expect(view.state.doc.toString()).toBe("```time\n" + doc + "\n```");
    view.destroy();
  });
});
