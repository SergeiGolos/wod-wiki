/**
 * Autocomplete & Commands Extension
 *
 * Per PRD / ADR:
 * - **Dialect Completion**: Typing ``` triggers dialect dropdown (wod, log, plan).
 * - **Component Embeds**: Typing --- triggers embeddable component dropdown.
 * - **Auto-Wrapping**: Selecting text + typing ``` wraps in dialect fence.
 * - **Snippet Support**: Frontmatter components insert YAML with cursor placement.
 * - **Smart Wrapping Command**: Cmd+Shift+W to wrap selection in ```wod fence.
 */

import {
  autocompletion,
  CompletionContext,
  CompletionResult,
  Completion,
  snippet,
} from "@codemirror/autocomplete";
import { EditorView, keymap } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { activeCursorSection } from "./section-state";

// ---------- Dialect Completions ----------

const DIALECTS: Completion[] = [
  {
    label: "```wod",
    displayLabel: "wod — Workout definition",
    type: "keyword",
    apply: "```wod\n${}\n```",
    boost: 3,
  },
  {
    label: "```log",
    displayLabel: "log — Workout log",
    type: "keyword",
    apply: "```log\n${}\n```",
    boost: 2,
  },
  {
    label: "```plan",
    displayLabel: "plan — Workout plan template",
    type: "keyword",
    apply: "```plan\n${}\n```",
    boost: 1,
  },
];

/**
 * CompletionSource: triggers when typing ``` at start of line inside a markdown section.
 */
function dialectCompletion(context: CompletionContext): CompletionResult | null {
  // Match ``` at start of line (possibly with leading whitespace)
  const line = context.state.doc.lineAt(context.pos);
  const lineText = line.text.slice(0, context.pos - line.from);

  if (!/^\s*`{1,3}$/.test(lineText)) return null;

  // Only trigger in markdown sections (not inside existing fences)
  const section = activeCursorSection(context.state);
  if (section && section.type !== "markdown") return null;

  const from = line.from + lineText.search(/`/);

  return {
    from,
    options: DIALECTS.map((d) => ({
      ...d,
      apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
        const insert = `\`\`\`${d.label.slice(3)}\n\n\`\`\``;
        const cursorPos = from + `\`\`\`${d.label.slice(3)}\n`.length;
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: cursorPos },
        });
      },
    })),
  };
}

// ---------- Component Embed Completions ----------

interface EmbedTemplate {
  label: string;
  description: string;
  template: string;
}

const EMBED_TEMPLATES: EmbedTemplate[] = [
  {
    label: "youtube",
    description: "Embed a YouTube video",
    template: "---\ntype: youtube\nurl: ${1:https://youtube.com/watch?v=}\n---",
  },
  {
    label: "strava",
    description: "Embed a Strava activity",
    template: "---\ntype: strava\nurl: ${1:https://strava.com/activities/}\n---",
  },
  {
    label: "amazon",
    description: "Embed an Amazon product",
    template: "---\ntype: amazon\nurl: ${1:https://amazon.com/dp/}\n---",
  },
  {
    label: "file",
    description: "Embed a file reference",
    template: "---\ntype: file\npath: ${1:./path/to/file}\n---",
  },
];

/**
 * CompletionSource: triggers when typing --- at start of line in a markdown section.
 */
function embedCompletion(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos);
  const lineText = line.text.slice(0, context.pos - line.from);

  if (!/^\s*-{2,3}$/.test(lineText)) return null;

  // Only trigger in markdown sections
  const section = activeCursorSection(context.state);
  if (section && section.type !== "markdown") return null;

  const from = line.from + lineText.search(/-/);

  return {
    from,
    options: EMBED_TEMPLATES.map((tmpl) => ({
      label: `--- ${tmpl.label}`,
      displayLabel: `${tmpl.label} — ${tmpl.description}`,
      type: "text",
      apply: snippet(tmpl.template),
      boost: 1,
    })),
  };
}

// ---------- Smart Wrapping Command ----------

/**
 * Wrap the current selection in a ```wod fence.
 * If no selection, insert a snippet with cursor between fences.
 */
function wrapInWodFence(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const hasSelection = from !== to;

  if (hasSelection) {
    const selectedText = view.state.sliceDoc(from, to);
    const wrapped = "```wod\n" + selectedText + "\n```";
    view.dispatch({
      changes: { from, to, insert: wrapped },
      selection: { anchor: from + 4 }, // After ```wod\n
    });
  } else {
    const insert = "```wod\n\n```";
    const cursorPos = from + "```wod\n".length;
    view.dispatch({
      changes: { from, to: from, insert },
      selection: { anchor: cursorPos },
    });
  }

  return true;
}

// ---------- Public Extensions ----------

/**
 * Keybindings for smart wrapping and editor commands.
 */
export const wodEditorKeymap = keymap.of([
  {
    key: "Mod-Shift-w",
    run: wrapInWodFence,
  },
]);

/**
 * Combined autocomplete sources for the unified editor.
 */
export const wodAutocompletion: Extension = autocompletion({
  override: [dialectCompletion, embedCompletion],
  defaultKeymap: true,
});
