import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "bun:test";
import { sessionQueryInsert, sessionQueryWql } from "../sessionQueryBlock";
import { sectionField } from "../section-state";

/**
 * #944 — write-on-completion: the session query block lands directly after
 * the workout block, stacks newest-first across re-runs, and refuses to
 * attach to non-workout or unknown sections.
 */
describe("sessionQueryBlock", () => {
  const doc = "# Plan\n\n```time\n10 Pushups\n```\n\nNotes after.";

  function createState(text: string) {
    return EditorState.create({ doc: text, extensions: [sectionField] });
  }

  function workoutBlockId(state: EditorState): string {
    const section = state.field(sectionField).sections.find((s) => s.type === "time");
    if (!section) throw new Error("no workout section in fixture");
    return section.id;
  }

  it("inserts a query:table block with the session rows query after the workout block", () => {
    const state = createState(doc);
    const insert = sessionQueryInsert(state, workoutBlockId(state), "r1");
    expect(insert).not.toBeNull();

    const next = state.update({ changes: insert! }).state;
    expect(next.doc.toString()).toBe(
      "# Plan\n\n```time\n10 Pushups\n```\n\n```query:table\nrows:{result:r1}\n```\n\nNotes after.",
    );
  });

  it("stacks a re-run newest-first between the workout block and the prior table", () => {
    let state = createState(doc);
    const blockId = workoutBlockId(state);

    state = state.update({ changes: sessionQueryInsert(state, blockId, "r1")! }).state;
    state = state.update({ changes: sessionQueryInsert(state, blockId, "r2")! }).state;

    const text = state.doc.toString();
    expect(text.indexOf("rows:{result:r2}")).toBeLessThan(text.indexOf("rows:{result:r1}"));
    expect(text).toBe(
      "# Plan\n\n```time\n10 Pushups\n```\n\n```query:table\nrows:{result:r2}\n```\n\n```query:table\nrows:{result:r1}\n```\n\nNotes after.",
    );
  });

  it("places the table by live section identity after edits above the block", () => {
    let state = createState(doc);
    const blockId = workoutBlockId(state);
    // Edit above the block: heading grows by a line — the workout block moves.
    state = state.update({ changes: { from: 0, insert: "Intro line\n\n" } }).state;

    const insert = sessionQueryInsert(state, blockId, "r1");
    expect(insert).not.toBeNull();
    const text = state.update({ changes: insert! }).state.doc.toString();
    expect(text).toContain("```time\n10 Pushups\n```\n\n```query:table\nrows:{result:r1}\n```");
  });

  it("returns null for markdown sections and unknown block ids", () => {
    const state = createState(doc);
    const markdown = state.field(sectionField).sections.find((s) => s.type === "markdown");
    expect(markdown).toBeDefined();
    expect(sessionQueryInsert(state, markdown!.id, "r1")).toBeNull();
    expect(sessionQueryInsert(state, "no-such-block", "r1")).toBeNull();
  });

  it("scopes the query to the completed session result only", () => {
    expect(sessionQueryWql("abc")).toBe("rows:{result:abc}");
  });
});
