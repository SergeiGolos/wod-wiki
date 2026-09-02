import { describe, it, expect } from "bun:test";
import { EditorState } from "@codemirror/state";
import { sectionField } from "@bitcobblers/wod-wiki-ui/extensions";
import {
  cursorFocusExtension,
  getCursorFocusState,
} from "./cursorFocusExtension";
import { MetricType } from "@bitcobblers/wod-wiki-engine";

describe("cursorFocusExtension", () => {
  it("assigns token-level metric highlight marks based on parser metrics", () => {
    const doc = [
      "# Repro Note",
      "",
      "```time",
      "Timer: 1:00",
      "10 Pushups",
      "20m Row @2:00/500m",
      "Round x 5:",
      "  rest 1:00",
      "```",
      "",
    ].join("\n");

    const state = EditorState.create({
      doc,
      extensions: [sectionField, cursorFocusExtension],
    });

    const focus = getCursorFocusState(state);
    // Cursor is at doc start (outside workout section)
    expect(focus).toBeNull();

    // Now position cursor inside line "10 Pushups" (around "Pushups")
    const pushupsPos = doc.indexOf("Pushups") + 2;
    const activeState = state.update({
      selection: { anchor: pushupsPos },
    }).state;

    const activeFocus = getCursorFocusState(activeState);
    expect(activeFocus).not.toBeNull();
    expect(activeFocus?.statement).toBeDefined();
    expect(activeFocus?.focusedMetric?.type).toBe(MetricType.Effort);

    // Read decorations directly from StateField to inspect all token mark ranges
    const internalStateField = (cursorFocusExtension as unknown as StateField<unknown>[])[0];
    const decos = activeState.field(internalStateField).decos;

    const markRanges: { from: number; to: number; text: string; cls: string }[] = [];
    const iter = decos.iter();
    while (iter.value) {
      if ((iter.value.spec as unknown as { class?: string }).class) {
        markRanges.push({
          from: iter.from,
          to: iter.to,
          text: doc.slice(iter.from, iter.to),
          cls: (iter.value.spec as unknown as { class: string }).class,
        });
      }
      iter.next();
    }

    // Verify token-level ranges (NOT whole lines!)
    const durationMarks = markRanges.filter((m) => m.cls.includes("duration"));
    expect(durationMarks.some((m) => m.text === "1:00")).toBe(true);
    expect(durationMarks.some((m) => m.text === "2:00")).toBe(true);

    const repMarks = markRanges.filter((m) => m.cls.includes("rep"));
    expect(repMarks.some((m) => m.text === "10")).toBe(true);
    expect(repMarks.some((m) => m.text === "5")).toBe(true);

    const effortMarks = markRanges.filter((m) => m.cls.includes("effort"));
    expect(effortMarks.some((m) => m.text === "Pushups")).toBe(true);
    expect(effortMarks.some((m) => m.text === "Row")).toBe(true);
    expect(effortMarks.some((m) => m.text === "rest")).toBe(true);

    const distanceMarks = markRanges.filter((m) => m.cls.includes("distance"));
    expect(distanceMarks.some((m) => m.text === "20m")).toBe(true);
    expect(distanceMarks.some((m) => m.text === "500m")).toBe(true);

    // Active line tokens ("10 Pushups") should have full-opacity classes, while other lines have -dim classes
    const activePushupsMark = markRanges.find((m) => m.text === "Pushups");
    expect(activePushupsMark?.cls).toBe("cm-metric-underline-effort");

    const activeRepMark = markRanges.find((m) => m.text === "10");
    expect(activeRepMark?.cls).toBe("cm-metric-underline-rep");

    const dimDurationMark = markRanges.find((m) => m.text === "2:00");
    expect(dimDurationMark?.cls).toBe("cm-metric-underline-duration-dim");
  });

  it("updates focus state when cursor moves between lines", () => {
    const doc = [
      "```time",
      "10 Pushups",
      "20m Row",
      "```",
    ].join("\n");

    const state = EditorState.create({
      doc,
      extensions: [sectionField, cursorFocusExtension],
    });

    const pushupsState = state.update({
      selection: { anchor: doc.indexOf("Pushups") },
    }).state;

    const pushupsFocus = getCursorFocusState(pushupsState);
    expect(pushupsFocus?.statement).toBeDefined();
    expect(pushupsFocus?.focusedMetric?.type).toBe(MetricType.Effort);

    const rowState = state.update({
      selection: { anchor: doc.indexOf("20m") },
    }).state;

    const rowFocus = getCursorFocusState(rowState);
    expect(rowFocus?.statement).toBeDefined();
    expect(rowFocus?.focusedMetric?.type).toBe(MetricType.Distance);
  });
});
