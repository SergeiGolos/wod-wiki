/**
 * Autocomplete & Commands Extension
 *
 * Per PRD / ADR (#892):
 * - **Fence Completion**: Typing ``` offers the fence-tag dropdown
 *   (time, log, query, query:timeseries — the ```dashboard fence retired in
 *   #899; :sport suffix UX is fog).
 * - **Component Embeds**: Typing --- triggers embeddable component dropdown.
 * - **Auto-Wrapping**: Selecting text + typing ` wraps in a ```time fence.
 * - **Snippet Support**: Frontmatter components insert YAML with cursor placement.
 * - **Smart Wrapping Command**: Cmd+Shift+W to wrap selection in ```time fence.
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
import { activeCursorSection, sectionField } from "./section-state";

// ---------- Fence-Tag Completions ----------

const FENCE_TAGS: Completion[] = [
  {
    label: "```time",
    displayLabel: "time — Runnable workout",
    type: "keyword",
    apply: "```time\n${}\n```",
    boost: 4,
  },
  {
    label: "```log",
    displayLabel: "log — Recorded workout (no Run)",
    type: "keyword",
    apply: "```log\n${}\n```",
    boost: 3,
  },
  {
    label: "```query",
    displayLabel: "query — Live WQL query block",
    type: "keyword",
    apply: "```query\n${}\n```",
    boost: 2,
  },
  {
    label: "```query:timeseries",
    displayLabel: "query:timeseries — dashboard widget (type[-N|-full], #899)",
    type: "keyword",
    apply: "```query:timeseries\n${}\n```",
    boost: 1,
  },
];

/**
 * CompletionSource: triggers when typing ``` at start of line inside a markdown section.
 */
export function fenceCompletion(context: CompletionContext): CompletionResult | null {
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
    options: FENCE_TAGS.map((d) => ({
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

/** Opening fence of a runnable block, newline included. */
const TIME_FENCE_OPEN = "```time\n";

/**
 * Wrap the current selection in a ```time fence.
 * If no selection, insert a snippet with cursor between fences.
 */
export function wrapInTimeFence(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const hasSelection = from !== to;

  if (hasSelection) {
    const selectedText = view.state.sliceDoc(from, to);
    const wrapped = TIME_FENCE_OPEN + selectedText + "\n```";
    view.dispatch({
      changes: { from, to, insert: wrapped },
      selection: { anchor: from + TIME_FENCE_OPEN.length }, // Start of wrapped content
    });
  } else {
    const insert = TIME_FENCE_OPEN + "\n```";
    const cursorPos = from + TIME_FENCE_OPEN.length;
    view.dispatch({
      changes: { from, to: from, insert },
      selection: { anchor: cursorPos },
    });
  }

  return true;
}

// ---------- Auto-Wrapping ----------

/**
 * beforeinput handler: with an active selection, typing the first ` of a
 * fence wraps the selection in a ```time fence instead of replacing it
 * (#892). Rejected when any section overlapping the selection range is not
 * markdown, so a wrap can never nest or straddle an existing fence — the
 * selection head alone is not enough (cross-section selections).
 */
export function handleFenceAutoWrap(event: InputEvent, view: EditorView): boolean {
  if (event.inputType !== "insertText" || event.data !== "`") return false;
  const sel = view.state.selection.main;
  if (sel.empty) return false;
  const { sections } = view.state.field(sectionField);
  const crossesFence = sections.some(
    (s) => s.type !== "markdown" && s.from < sel.to && s.to > sel.from,
  );
  if (crossesFence) return false;
  event.preventDefault();
  return wrapInTimeFence(view);
}

/** DOM event wiring for auto-wrap. */
export const wodAutoWrap: Extension = EditorView.domEventHandlers({
  beforeinput: handleFenceAutoWrap,
});

// ---------- Public Extensions ----------

/**
 * Keybindings for smart wrapping and editor commands.
 */
export const wodEditorKeymap = keymap.of([
  {
    key: "Mod-Shift-w",
    run: wrapInTimeFence,
  },
]);

/**
 * Combined autocomplete sources for the note editor.
 */
export const wodAutocompletion: Extension = autocompletion({
  override: [fenceCompletion, embedCompletion],
  defaultKeymap: true,
});
