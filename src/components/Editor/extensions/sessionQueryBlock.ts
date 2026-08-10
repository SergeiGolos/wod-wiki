/**
 * sessionQueryBlock — write-on-completion note mutation (#944).
 *
 * When a workout run completes, a ```query:table fence carrying the
 * session-scoped rows query is inserted into the note directly after the
 * workout block it belongs to. Placement is resolved live from sectionField
 * (content-identity lookup at insert time), so it survives edits above the
 * block. Inserting at exactly `section.to` stacks re-runs newest-first: the
 * new table lands between the workout block and any prior tables.
 */
import type { EditorState } from "@codemirror/state";
import { sectionField } from "./section-state";

/** Rows query the inserted table runs — the completed session only. */
export function sessionQueryWql(resultId: string): string {
  return `rows:{result:${resultId}}`;
}

/**
 * Change spec inserting the session query block after the workout section
 * identified by `blockId`, or null when the section is gone or not a
 * workout block (nothing sensible to attach the table to).
 */
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
