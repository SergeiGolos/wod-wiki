import type { EditorState } from "@codemirror/state";
import { sectionField } from "./section-state";

export function sessionQueryWql(resultId: string): string {
  // C4: target always explicit — `all` = every output type.
  return `rows:all{result:${resultId}}`;
}

export function sessionQueryInsert(
  state: EditorState,
  blockId: string,
  resultId: string,
  runBlock?: { id?: string; contentId?: string },
): { from: number; insert: string } | null {
  const sections = state.field(sectionField).sections;
  let section = sections.find((s) => s.id === blockId);
  if (!section && runBlock?.contentId) {
    section = sections.find((s) => s.contentId === runBlock.contentId);
  }
  if (!section && runBlock?.id) {
    section = sections.find((s) => s.id === runBlock.id);
  }
  if (!section && runBlock) {
    section = sections.find((s) => s.type === "time" || s.type === "log");
  }
  if (!section || (section.type !== "time" && section.type !== "log")) {
    return null;
  }
  return {
    from: section.to,
    insert: `\n\n\`\`\`query:table\n${sessionQueryWql(resultId)}\n\`\`\``,
  };
}
