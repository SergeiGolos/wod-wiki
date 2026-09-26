import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { StateField, EditorState, RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { parseFrontmatterBody, serializeFrontmatter } from "@bitcobblers/wod-wiki-wql";
import { sectionField } from "./section-state";

// ponytail: flat scalar and string-list properties with inline commit; add schema types / drag-to-reorder when multi-type nested schemas are required.
let pendingFocusKey: string | null = null;
let pendingFocusTagKey: string | null = null;

function parseTagList(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof val === "string" && val.trim()) {
    const s = val.trim();
    if (s.startsWith("[") && s.endsWith("]")) {
      return s
        .slice(1, -1)
        .split(",")
        .map((t) => t.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    }
    return [s.replace(/^['"]|['"]$/g, "")];
  }
  return [];
}

function updateFrontmatter(
  view: EditorView,
  sectionId: string,
  meta: Record<string, string | number | string[]>,
): void {
  if (view.state.readOnly) return;
  const { sections } = view.state.field(sectionField);
  const section =
    sections.find((s) => s.id === sectionId && s.type === "frontmatter") ||
    sections.find((s) => s.type === "frontmatter");
  if (!section) return;

  const nextBody = serializeFrontmatter(meta);
  if (section.contentFrom !== undefined && section.contentTo !== undefined) {
    view.dispatch({
      changes: {
        from: section.contentFrom,
        to: section.contentTo,
        insert: nextBody,
      },
    });
  } else {
    view.dispatch({
      changes: {
        from: section.from,
        to: section.to,
        insert: `---\n${nextBody}\n---`,
      },
    });
  }
}

function createTagIcon(): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", "shrink-0 h-3.5 w-3.5 text-muted-foreground/70");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z");
  svg.appendChild(path);

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "7");
  circle.setAttribute("cy", "7");
  circle.setAttribute("r", ".5");
  circle.setAttribute("fill", "currentColor");
  svg.appendChild(circle);

  return svg;
}

function createListIcon(): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", "shrink-0 h-3.5 w-3.5 text-muted-foreground/70");

  for (const y of ["6", "12", "18"]) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "4");
    line.setAttribute("x2", "20");
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    svg.appendChild(line);
  }

  return svg;
}

function createPlusIcon(): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", "shrink-0 h-3 w-3");

  const l1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  l1.setAttribute("x1", "12");
  l1.setAttribute("x2", "12");
  l1.setAttribute("y1", "5");
  l1.setAttribute("y2", "19");
  svg.appendChild(l1);

  const l2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  l2.setAttribute("x1", "5");
  l2.setAttribute("x2", "19");
  l2.setAttribute("y1", "12");
  l2.setAttribute("y2", "12");
  svg.appendChild(l2);

  return svg;
}

function createCloseIcon(size: "sm" | "md" = "md"): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", size === "sm" ? "2.5" : "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5");

  const l1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  l1.setAttribute("x1", "18");
  l1.setAttribute("x2", "6");
  l1.setAttribute("y1", "6");
  l1.setAttribute("y2", "18");
  svg.appendChild(l1);

  const l2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  l2.setAttribute("x1", "6");
  l2.setAttribute("x2", "18");
  l2.setAttribute("y1", "6");
  l2.setAttribute("y2", "18");
  svg.appendChild(l2);

  return svg;
}

export class DefaultFrontmatterWidget extends WidgetType {
  readonly sectionId: string;
  readonly rawContent: string;
  readonly readOnly: boolean;

  constructor(
    sectionIdOrProps: string | Record<string, string>,
    rawContent?: string,
    readOnly: boolean = false,
  ) {
    super();
    if (typeof sectionIdOrProps === "string") {
      this.sectionId = sectionIdOrProps;
      this.rawContent = rawContent ?? "";
      this.readOnly = readOnly;
    } else {
      this.sectionId = "legacy";
      this.rawContent = serializeFrontmatter(sectionIdOrProps);
      this.readOnly = readOnly;
    }
  }

  get props(): Record<string, string> {
    const body = this.rawContent.replace(/^---\r?\n?/, "").replace(/\r?\n?---\r?$/, "");
    const meta = parseFrontmatterBody(body);
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(meta)) {
      result[k] = Array.isArray(v) ? v.join(", ") : String(v ?? "");
    }
    return result;
  }

  eq(other: DefaultFrontmatterWidget): boolean {
    return (
      this.sectionId === other.sectionId &&
      this.rawContent === other.rawContent &&
      this.readOnly === other.readOnly
    );
  }

  ignoreEvent(): boolean {
    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const root = document.createElement("div");
    root.className = "cm-frontmatter-preview my-2 font-sans select-none";

    const heading = document.createElement("div");
    heading.className = "text-xs font-medium text-muted-foreground mb-1.5 px-0.5";
    heading.textContent = "Properties";
    root.appendChild(heading);

    const box = document.createElement("div");
    box.className = "rounded-lg border border-border/80 bg-background/50 overflow-hidden text-xs shadow-xs";
    root.appendChild(box);

    const body = this.rawContent.replace(/^---\r?\n?/, "").replace(/\r?\n?---\r?$/, "");
    const meta = parseFrontmatterBody(body);
    const entries = Object.entries(meta);

    if (entries.length === 0) {
      const emptyRow = document.createElement("div");
      emptyRow.className = "px-3 py-2 text-xs text-muted-foreground/60 italic";
      emptyRow.textContent = "No properties";
      box.appendChild(emptyRow);
    }

    for (const [key, value] of entries) {
      const isTags = key.toLowerCase() === "tags" || key.toLowerCase() === "category";

      const row = document.createElement("div");
      row.className =
        "flex items-center min-h-[34px] border-b border-dashed border-border/60 last:border-b-0 group hover:bg-muted/10 transition-colors";
      box.appendChild(row);

      // Key column
      const keyCol = document.createElement("div");
      keyCol.className =
        "flex items-center gap-2 px-3 py-1.5 w-36 shrink-0 border-r border-dashed border-border/60 text-muted-foreground";
      keyCol.appendChild(isTags ? createTagIcon() : createListIcon());

      if (this.readOnly) {
        const keyLabel = document.createElement("span");
        keyLabel.className = "truncate font-medium text-foreground/90";
        keyLabel.textContent = key;
        keyCol.appendChild(keyLabel);
      } else {
        const keyInput = document.createElement("input");
        keyInput.className =
          "w-full bg-transparent text-xs text-foreground/90 font-medium outline-none truncate hover:bg-muted/30 focus:bg-background focus:ring-1 focus:ring-ring rounded px-1 -mx-1";
        keyInput.value = key;
        keyInput.spellcheck = false;

        let currentKey = key;
        const commitKey = () => {
          const nextKey = keyInput.value.trim();
          if (!nextKey || nextKey === currentKey) {
            keyInput.value = currentKey;
            return;
          }
          if (!/^[A-Za-z_][\w.-]*$/.test(nextKey) || nextKey in meta) {
            keyInput.value = currentKey;
            return;
          }
          const newMeta: Record<string, string | number | string[]> = {};
          for (const [k, v] of Object.entries(meta)) {
            if (k === currentKey) newMeta[nextKey] = v;
            else newMeta[k] = v;
          }
          updateFrontmatter(view, this.sectionId, newMeta);
        };

        keyInput.addEventListener("change", commitKey);
        keyInput.addEventListener("blur", commitKey);
        keyInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            keyInput.blur();
          }
        });
        keyCol.appendChild(keyInput);

        if (key === pendingFocusKey) {
          setTimeout(() => {
            keyInput.focus();
            keyInput.select();
          }, 0);
          pendingFocusKey = null;
        }
      }
      row.appendChild(keyCol);

      // Value column
      const valCol = document.createElement("div");
      valCol.className = "flex items-center flex-wrap gap-1.5 px-3 py-1.5 flex-1 min-w-0";

      if (isTags) {
        const tags = parseTagList(value);
        for (let idx = 0; idx < tags.length; idx++) {
          const tag = tags[idx];
          const pill = document.createElement("span");
          pill.className =
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30";

          const tagText = document.createElement("span");
          tagText.textContent = tag;
          pill.appendChild(tagText);

          if (!this.readOnly) {
            const rmBtn = document.createElement("button");
            rmBtn.type = "button";
            rmBtn.setAttribute("aria-label", `Remove tag ${tag}`);
            rmBtn.className =
              "inline-flex items-center justify-center text-amber-700/60 hover:text-amber-950 dark:text-amber-400/60 dark:hover:text-amber-100 cursor-pointer";
            rmBtn.appendChild(createCloseIcon("sm"));
            rmBtn.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              const nextTags = tags.filter((_, i) => i !== idx);
              meta[key] = nextTags;
              updateFrontmatter(view, this.sectionId, meta);
            });
            pill.appendChild(rmBtn);
          }
          valCol.appendChild(pill);
        }

        if (!this.readOnly) {
          const tagInput = document.createElement("input");
          tagInput.className =
            "flex-1 min-w-[70px] bg-transparent text-xs text-foreground outline-none px-1 py-0.5 placeholder:text-muted-foreground/40";
          tagInput.placeholder = tags.length === 0 ? "Add tags…" : "Add tag…";

          const commitNewTag = () => {
            const val = tagInput.value.trim().replace(/^,|,$/g, "");
            if (val && !tags.includes(val)) {
              meta[key] = [...tags, val];
              tagInput.value = "";
              pendingFocusTagKey = key;
              updateFrontmatter(view, this.sectionId, meta);
            }
          };

          tagInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitNewTag();
            } else if (e.key === "Backspace" && !tagInput.value && tags.length > 0) {
              e.preventDefault();
              meta[key] = tags.slice(0, -1);
              pendingFocusTagKey = key;
              updateFrontmatter(view, this.sectionId, meta);
            }
          });
          tagInput.addEventListener("blur", () => {
            if (tagInput.value.trim()) commitNewTag();
          });
          valCol.appendChild(tagInput);

          if (pendingFocusTagKey === key) {
            setTimeout(() => {
              tagInput.focus();
            }, 0);
            pendingFocusTagKey = null;
          }
        }
      } else {
        const strVal = Array.isArray(value) ? value.join(", ") : String(value ?? "");
        if (this.readOnly) {
          const valSpan = document.createElement("span");
          valSpan.className = "text-xs text-foreground py-0.5 truncate";
          valSpan.textContent = strVal;
          valCol.appendChild(valSpan);
        } else {
          const valInput = document.createElement("input");
          valInput.className =
            "w-full bg-transparent text-xs text-foreground outline-none py-0.5 hover:bg-muted/20 focus:bg-background focus:ring-1 focus:ring-ring rounded px-1 -mx-1 transition-colors";
          valInput.value = strVal;
          valInput.spellcheck = false;

          let committedVal = strVal;
          const commitVal = () => {
            const cur = valInput.value.trim();
            if (cur !== committedVal) {
              committedVal = cur;
              const num = Number(cur);
              meta[key] = cur !== "" && !isNaN(num) ? num : cur;
              updateFrontmatter(view, this.sectionId, meta);
            }
          };

          valInput.addEventListener("change", commitVal);
          valInput.addEventListener("blur", commitVal);
          valInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              valInput.blur();
            }
          });
          valCol.appendChild(valInput);
        }
      }
      row.appendChild(valCol);

      // Delete property button
      if (!this.readOnly) {
        const actionsCol = document.createElement("div");
        actionsCol.className = "flex items-center pr-2";

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.setAttribute("aria-label", `Remove property ${key}`);
        delBtn.className =
          "opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive p-1 rounded transition-opacity cursor-pointer";
        delBtn.appendChild(createCloseIcon("md"));
        delBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const newMeta = { ...meta };
          delete newMeta[key];
          updateFrontmatter(view, this.sectionId, newMeta);
        });
        actionsCol.appendChild(delBtn);
        row.appendChild(actionsCol);
      }
    }

    if (!this.readOnly) {
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className =
        "mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-1 py-1 cursor-pointer transition-colors select-none";
      addBtn.appendChild(createPlusIcon());
      const addLabel = document.createElement("span");
      addLabel.textContent = "Add property";
      addBtn.appendChild(addLabel);

      addBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        let newKey = "property";
        let count = 1;
        while (newKey in meta) {
          count++;
          newKey = `property_${count}`;
        }
        pendingFocusKey = newKey;
        const newMeta = { ...meta, [newKey]: "" };
        updateFrontmatter(view, this.sectionId, newMeta);
      });
      root.appendChild(addBtn);
    }

    return root;
  }
}

function buildFrontmatterDecos(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { sections } = state.field(sectionField);

  for (const section of sections) {
    if (section.type !== "frontmatter") continue;

    const rawContent = state.doc.sliceString(section.from, section.to);
    builder.add(
      section.from,
      section.to,
      Decoration.replace({
        widget: new DefaultFrontmatterWidget(section.id, rawContent, state.readOnly),
        block: true,
      }),
    );
  }

  return builder.finish();
}

export const frontmatterPreviewField = StateField.define<DecorationSet>({
  create(state) {
    return buildFrontmatterDecos(state);
  },
  update(deco, tr) {
    if (tr.docChanged || tr.reconfigured) {
      return buildFrontmatterDecos(tr.state);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const frontmatterPreview: Extension = [frontmatterPreviewField];
