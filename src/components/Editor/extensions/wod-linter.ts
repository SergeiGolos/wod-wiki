/**
 * WodScript Linting Extension
 * 
 * CM6 LintSource that runs the WodScript parser on content within code fences
 * and shows real-time syntax errors as inline underlines.
 * 
 * Per ADR: "Develop a LintSource that runs the WodScript parser on content
 * within code fences to show real-time syntax errors as inline underlines."
 */

import { Diagnostic, linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { sectionField } from "./section-state";
import { wodscriptLanguage } from "@/hooks/useRuntimeParser";
import { syntaxTree } from "@codemirror/language";

/**
 * Parse WodScript content and extract error nodes from the Lezer tree.
 */
function findWodErrors(content: string, offsetInDoc: number): Diagnostic[] {
  if (!content.trim()) return [];

  const doc = content.endsWith("\n") ? content : content + "\n";
  const tempState = EditorState.create({
    doc,
    extensions: [wodscriptLanguage],
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
          to: Math.min(to, from + 50), // Cap underline length
          severity: "error",
          message: "Syntax error in WodScript",
        });
      }
    },
  });

  return diagnostics;
}

/**
 * Lint source that finds WodScript errors inside fenced code blocks.
 */
function wodLintSource(view: EditorView): Diagnostic[] {
  const { sections } = view.state.field(sectionField);
  const diagnostics: Diagnostic[] = [];

  for (const section of sections) {
    if (section.type !== "wod") continue;
    if (section.contentFrom === undefined || section.contentTo === undefined) continue;

    const innerContent = view.state.doc.sliceString(
      section.contentFrom,
      section.contentTo
    );

    const errors = findWodErrors(innerContent, section.contentFrom);
    diagnostics.push(...errors);
  }

  return diagnostics;
}

/**
 * CM6 linter extension for WodScript code fences.
 * Debounced at 500ms to avoid excessive parsing during typing.
 */
export const wodLinter = linter(wodLintSource, {
  delay: 500,
});
