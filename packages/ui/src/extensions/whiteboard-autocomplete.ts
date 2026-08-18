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

const FENCE_TAGS: Completion[] = [
  {
    label: "```time",
    detail: "Whiteboard Script (timer)",
    type: "keyword",
    apply: snippet("```time\n${}\n```"),
    boost: 90,
  },
  {
    label: "```log",
    detail: "Whiteboard Script (log/completed)",
    type: "keyword",
    apply: snippet("```log\n${}\n```"),
    boost: 85,
  },
  {
    label: "```query",
    detail: "WQL Analytics Query",
    type: "keyword",
    apply: snippet("```query\n${}\n```"),
    boost: 80,
  },
  {
    label: "```widget",
    detail: "Custom React Widget",
    type: "keyword",
    apply: snippet("```widget:${name}\n${}\n```"),
    boost: 75,
  },
];

export function fenceCompletion(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos);
  const textBefore = line.text.slice(0, context.pos - line.from);

  const match = textBefore.match(/^`{1,3}(\w*)$/);
  if (!match) return null;

  const section = activeCursorSection(context.state);
  if (section && section.type !== "markdown") return null;

  return {
    from: line.from,
    options: FENCE_TAGS,
    validFor: /^`{1,3}\w*$/,
  };
}

export function wrapInTimeFence(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.doc.sliceString(from, to);

  if (!selected) {
    view.dispatch({
      changes: { from, insert: "```time\n\n```" },
      selection: { anchor: from + 8 },
    });
  } else {
    view.dispatch({
      changes: {
        from,
        to,
        insert: `\`\`\`time\n${selected}\n\`\`\``,
      },
    });
  }
  return true;
}

export function handleFenceAutoWrap(event: InputEvent, view: EditorView): boolean {
  if (event.data !== "`") return false;
  const { from, to } = view.state.selection.main;
  if (from === to) return false;

  const selected = view.state.doc.sliceString(from, to);
  view.dispatch({
    changes: {
      from,
      to,
      insert: `\`\`\`time\n${selected}\n\`\`\``,
    },
  });
  return true;
}

export const wodAutoWrap: Extension = EditorView.domEventHandlers({
  beforeinput: handleFenceAutoWrap,
});

export const wodEditorKeymap = keymap.of([
  {
    key: "Mod-Shift-w",
    run: wrapInTimeFence,
  },
]);

export const wodAutocompletion: Extension = autocompletion({
  override: [fenceCompletion],
});
