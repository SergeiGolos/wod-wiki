import { linter } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { whiteboardScriptLanguage } from '@bitcobblers/wod-wiki-lang';
import { sectionField } from "./section-state";

export function findWorkoutErrors(content: string, offsetInDoc: number): Diagnostic[] {
  if (!content.trim()) return [];

  const doc = content.endsWith("\n") ? content : content + "\n";
  const tempState = EditorState.create({
    doc,
    extensions: [whiteboardScriptLanguage],
  });

  const tree = syntaxTree(tempState);
  const diagnostics: Diagnostic[] = [];

  tree.iterate({
    enter(node) {
      if (node.type.isError) {
        const from = offsetInDoc + node.from;
        const to = offsetInDoc + Math.max(node.to, node.from + 1);
        diagnostics.push({
          from,
          to: Math.min(to, from + 50),
          severity: "error",
          message: "Syntax error in Whiteboard Script",
        });
      }
    },
  });

  return diagnostics;
}

export function workoutLintSource(view: EditorView): Diagnostic[] {
  // The linter may run against states that don't include the section-state
  // extension (e.g. standalone script editors) — nothing to lint then.
  const { sections } = view.state.field(sectionField, false) ?? { sections: [] };
  const diagnostics: Diagnostic[] = [];

  for (const section of sections) {
    if (section.type !== "time" && section.type !== "log") continue;
    if (section.contentFrom === undefined || section.contentTo === undefined) continue;

    const innerContent = view.state.doc.sliceString(
      section.contentFrom,
      section.contentTo,
    );

    const errors = findWorkoutErrors(innerContent, section.contentFrom);
    diagnostics.push(...errors);
  }

  return diagnostics;
}

export const wodLinter = linter(workoutLintSource, {
  delay: 500,
});
