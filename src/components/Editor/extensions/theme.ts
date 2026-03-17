import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";

export function editorTheme(isDark: boolean): Extension {
  const baseTheme = EditorView.theme({
    "&": {
      height: "100%",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      fontSize: "14px"
    },
    ".cm-scroller": {
      overflow: "auto",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
    },
    ".cm-content": {
      fontFamily: "Monaco, Menlo, Ubuntu Mono, Consolas, monospace",
      lineHeight: "22px",
      padding: "0"
    },
    ".cm-gutters": {
      backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5",
      color: isDark ? "#858585" : "#999999",
      border: "none",
      padding: "0",
    },

    // Semi-transparent so the drawSelection layer (rendered behind .cm-content)
    // can bleed through and remain visible when text is selected on the active line.
    ".cm-activeLine": {
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(59, 130, 246, 0.09)"
    },
    ".cm-activeLineGutter": {
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(59, 130, 246, 0.09)"
    },
    // Selection layer — must be strong enough to show through the transparent line bg.
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: isDark ? "rgba(100, 160, 255, 0.35)" : "rgba(30, 100, 230, 0.50)"
    },
    ".cm-selectionBackground": {
      backgroundColor: isDark ? "rgba(100, 160, 255, 0.20)" : "rgba(30, 100, 230, 0.25)"
    },
    "::selection": {
      backgroundColor: isDark ? "rgba(100, 160, 255, 0.35) !important" : "rgba(30, 100, 230, 0.50) !important"
    }
  }, { dark: isDark });

  // In dark mode put baseTheme AFTER oneDark so our semi-transparent activeLine
  // and selection rules take precedence over oneDark's opaque equivalents.
  return isDark ? [oneDark, baseTheme] : [baseTheme];
}
