import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";

export function editorTheme(isDark: boolean): Extension {
  const baseTheme = EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "14px"
    },
    ".cm-content": {
      fontFamily: "Monaco, Menlo, Ubuntu Mono, Consolas, monospace",
      padding: "16px 0"
    },
    ".cm-gutters": {
      backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5",
      color: isDark ? "#858585" : "#999999",
      border: "none",
      padding: "0 8px"
    },
    ".cm-activeLine": {
      backgroundColor: isDark ? "#2c2c2c" : "#e8f2ff"
    },
    ".cm-activeLineGutter": {
      backgroundColor: isDark ? "#2c2c2c" : "#e8f2ff"
    }
  }, { dark: isDark });

  return isDark ? [baseTheme, oneDark] : [baseTheme];
}
