import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";

export function editorTheme(isDark: boolean): Extension {
  const baseTheme = EditorView.theme({
    "&": {
      height: "auto",
      minHeight: "100%",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      fontSize: "14px",
      textAlign: "left",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-scroller": {
      overflow: "visible",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
    },
    ".cm-content": {
      fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace",
      lineHeight: "22px",
      padding: "0",
      margin: "0 3px",
      textAlign: "left",
    },
    ".cm-gutters": {
      backgroundColor: isDark ? "#252841" : "transparent",
      color: isDark ? "#A0AEC0" : "#717D96",
      border: "none",
      padding: "0",
    },
    ".cm-activeLine": {
      backgroundColor: isDark ? "rgba(165, 180, 252, 0.08)" : "rgba(129, 140, 248, 0.08)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: isDark ? "rgba(165, 180, 252, 0.08)" : "rgba(129, 140, 248, 0.08)",
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: isDark ? "rgba(165, 180, 252, 0.3)" : "rgba(129, 140, 248, 0.35)",
    },
    ".cm-selectionBackground": {
      backgroundColor: isDark ? "rgba(100, 160, 255, 0.20)" : "rgba(30, 100, 230, 0.25)",
    },
    "::selection": {
      backgroundColor: isDark ? "rgba(100, 160, 255, 0.35) !important" : "rgba(30, 100, 230, 0.50) !important",
    },
  }, { dark: isDark });

  return isDark ? [oneDark, baseTheme] : [baseTheme];
}
