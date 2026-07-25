/**
 * FrontmatterCompanion
 *
 * Overlay companion component for frontmatter and embed sections.
 * Detects the subtype (YouTube, Amazon, effort, etc.) and renders
 * the appropriate preview. For effort frontmatter, renders structured
 * controls that write back to the underlying YAML/frontmatter source.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { Plus, X } from "lucide-react";
import { sectionField, type EditorSection } from '@/components/Editor/extensions/section-state';
import { parseFlatProperties, parseFrontmatterBody, serializeFrontmatter, extractYouTubeVideoId, detectUrlSubtype, type ParsedFrontmatter } from "@/lib/frontmatter";
import { cn } from "@/lib/utils";
import { Label } from "@/components/atoms/primitives/label";

// ── Types ────────────────────────────────────────────────────────────

type FrontmatterSubtype = "link" | "youtube" | "amazon" | "strava" | "effort" | "default";

interface EffortFrontmatterData {
  id?: string;
  slug?: string;
  label?: string;
  aliases: string[];
  met?: string;
  discipline?: string;
  intensityTier?: string;
  registrySource?: string;
  createdAt?: string;
  updatedAt?: string;
  derivation?: {
    parentSlug?: string;
    coefficients?: Record<string, string>;
    hardOverrides?: Record<string, string>;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function getSection(view: EditorView, sectionId: string): EditorSection | undefined {
  const { sections } = view.state.field(sectionField);
  return sections.find((s) => s.id === sectionId);
}

function getSectionInnerContent(view: EditorView, section: EditorSection): string {
  if (section.contentFrom === undefined || section.contentTo === undefined) return "";
  return view.state.doc.sliceString(section.contentFrom, section.contentTo);
}

function parseYamlScalar(val: string): string {
  const trimmed = val.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/\\'/g, "'");
  }
  return trimmed;
}

function quoteYaml(val: string): string {
  if (!val) return '""';
  if (/[":'\n#{}\[\],&*?\|\-<>=%!@`]/.test(val) || val !== val.trim()) {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return val;
}

function detectSubtype(props: Record<string, string>): FrontmatterSubtype {
  const typeValue = (props.type || "").toLowerCase();
  if (typeValue === "youtube") return "youtube";
  if (typeValue === "amazon") return "amazon";
  if (typeValue === "strava") return "strava";
  if (typeValue === "effort") return "effort";

  if (props.source_url || props.website) return "link";

  const url = props.url || props.link || "";
  const urlSubtype = detectUrlSubtype(url);
  if (urlSubtype) return urlSubtype;

  // Effort frontmatter uses a predictable metadata envelope. Only the
  // canonical nested doc (baseAttributes / registrySource) is detected —
  // bundled files and user docs all use the nested shape.
  if (
    props.registrySource !== undefined ||
    props.baseAttributes !== undefined
  ) {
    return "effort";
  }

  return "default";
}

function parseAliases(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function parseEffortFrontmatter(innerContent: string): EffortFrontmatterData {
  const data: EffortFrontmatterData = {
    aliases: [],
  };

  let context: "root" | "aliases" | "baseAttributes" | "derivation" | "coefficients" | "hardOverrides" = "root";

  for (const line of innerContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;
    if (indent === 0) {
      context = "root";
      if (trimmed === "aliases:") {
        context = "aliases";
        continue;
      }
      if (trimmed === "baseAttributes:") {
        context = "baseAttributes";
        continue;
      }
      if (trimmed === "derivation:") {
        context = "derivation";
        data.derivation ??= {};
        continue;
      }

      const match = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      const value = parseYamlScalar(match[2]);
      switch (key) {
        case "id":
          data.id = value;
          break;
        case "slug":
          data.slug = value;
          break;
        case "label":
          data.label = value;
          break;
        case "aliases":
          if (value === "[]") data.aliases = [];
          break;
        case "registrySource":
          data.registrySource = value;
          break;
        case "createdAt":
          data.createdAt = value;
          break;
        case "updatedAt":
          data.updatedAt = value;
          break;
        default:
          break;
      }
      continue;
    }

    if (indent === 2) {
      if (context === "aliases" && trimmed.startsWith("- ")) {
        data.aliases.push(parseYamlScalar(trimmed.slice(2)));
        continue;
      }

      const match = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      const value = parseYamlScalar(match[2]);

      if (context === "baseAttributes") {
        switch (key) {
          case "met":
            data.met = value;
            break;
          case "discipline":
            data.discipline = value;
            break;
          case "intensityTier":
            data.intensityTier = value;
            break;
          default:
            break;
        }
        continue;
      }

      if (context === "derivation") {
        data.derivation ??= {};
        switch (key) {
          case "parentSlug":
            data.derivation.parentSlug = value;
            break;
          case "coefficients":
            context = "coefficients";
            data.derivation.coefficients ??= {};
            break;
          case "hardOverrides":
            context = "hardOverrides";
            data.derivation.hardOverrides ??= {};
            break;
          default:
            break;
        }
        continue;
      }
    }

    if (indent === 4 && data.derivation) {
      const match = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      const value = parseYamlScalar(match[2]);
      if (context === "coefficients") {
        data.derivation.coefficients ??= {};
        data.derivation.coefficients[key] = value;
      } else if (context === "hardOverrides") {
        data.derivation.hardOverrides ??= {};
        data.derivation.hardOverrides[key] = value;
      }
    }
  }

  return data;
}

function serializeEffortFrontmatter(data: EffortFrontmatterData): string {
  const lines: string[] = [];

  if (data.id) lines.push(`id: ${quoteYaml(data.id)}`);
  if (data.slug) lines.push(`slug: ${quoteYaml(data.slug)}`);
  if (data.label) lines.push(`label: ${quoteYaml(data.label)}`);

  if (data.aliases.length > 0) {
    lines.push("aliases:");
    for (const alias of data.aliases) {
      lines.push(`  - ${quoteYaml(alias)}`);
    }
  } else {
    lines.push("aliases: []");
  }

  lines.push("baseAttributes:");
  if (data.met !== undefined && data.met !== "") lines.push(`  met: ${data.met}`);
  if (data.discipline) lines.push(`  discipline: ${quoteYaml(data.discipline)}`);
  if (data.intensityTier) lines.push(`  intensityTier: ${quoteYaml(data.intensityTier)}`);

  if (data.registrySource) lines.push(`registrySource: ${quoteYaml(data.registrySource)}`);

  if (data.derivation && (
    data.derivation.parentSlug ||
    (data.derivation.coefficients && Object.keys(data.derivation.coefficients).length > 0) ||
    (data.derivation.hardOverrides && Object.keys(data.derivation.hardOverrides).length > 0)
  )) {
    lines.push("derivation:");
    if (data.derivation.parentSlug) {
      lines.push(`  parentSlug: ${quoteYaml(data.derivation.parentSlug)}`);
    }
    if (data.derivation.coefficients && Object.keys(data.derivation.coefficients).length > 0) {
      lines.push("  coefficients:");
      for (const [key, value] of Object.entries(data.derivation.coefficients)) {
        lines.push(`    ${key}: ${value}`);
      }
    }
    if (data.derivation.hardOverrides && Object.keys(data.derivation.hardOverrides).length > 0) {
      lines.push("  hardOverrides:");
      for (const [key, value] of Object.entries(data.derivation.hardOverrides)) {
        lines.push(`    ${key}: ${JSON.stringify(value)}`);
      }
    }
  }

  if (data.createdAt) lines.push(`createdAt: ${quoteYaml(data.createdAt)}`);
  if (data.updatedAt) lines.push(`updatedAt: ${quoteYaml(data.updatedAt)}`);

  return lines.join("\n");
}

function replaceFrontmatterContent(
  view: EditorView,
  section: EditorSection,
  nextInnerContent: string,
): void {
  if (section.contentFrom === undefined || section.contentTo === undefined) return;
  view.dispatch({
    changes: {
      from: section.contentFrom,
      to: section.contentTo,
      insert: nextInnerContent,
    },
  });
}

function parseEffortSummary(data: EffortFrontmatterData): string {
  const pieces = [data.slug, data.label, data.met ? `${data.met} MET` : undefined].filter(Boolean);
  return pieces.join(" · ");
}

// ── Components ───────────────────────────────────────────────────────

export interface FrontmatterCompanionProps {
  sectionId: string;
  section?: EditorSection;
  view: EditorView;
  isActive: boolean;
  widthPercent: number;
  docVersion: number;
}

const EffortFrontmatterCompanion: React.FC<{
  section: EditorSection;
  view: EditorView;
  isActive: boolean;
  widthPercent: number;
  rawContent: string;
}> = ({ section, view, isActive, widthPercent, rawContent }) => {
  const effort = useMemo(() => parseEffortFrontmatter(rawContent), [rawContent]);

  const commitEffort = useCallback(
    (patch: Partial<EffortFrontmatterData>) => {
      const next = serializeEffortFrontmatter({
        ...effort,
        ...patch,
        aliases: patch.aliases ?? effort.aliases,
        derivation: patch.derivation ?? effort.derivation,
      });
      replaceFrontmatterContent(view, section, next);
    },
    [effort, section, view],
  );

  const compact = !isActive || widthPercent < 24;

  return (
    <div className={cn("h-full w-full overflow-auto rounded-l-md border-l border-border bg-popover/95 text-foreground shadow-sm", compact ? "p-2" : "p-3") }>
      <div className="sticky top-0 z-10 -mx-2 -mt-2 mb-3 border-b border-border bg-popover/95 px-2 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Effort
          </span>
          <span className="truncate text-sm font-medium">{effort.label || effort.slug || "Untitled effort"}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          {effort.slug && <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{effort.slug}</span>}
          {effort.met && <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{effort.met} MET</span>}
          {effort.discipline && <span className="rounded bg-muted px-1.5 py-0.5">{effort.discipline}</span>}
          {effort.intensityTier && <span className="rounded bg-muted px-1.5 py-0.5 uppercase">{effort.intensityTier}</span>}
        </div>
      </div>

      {compact ? (
        <div className="space-y-2 text-xs">
          <div className="rounded-md border border-border/70 bg-background/70 p-2">
            <div className="font-medium">{effort.label || "Untitled effort"}</div>
            <div className="mt-1 text-muted-foreground">{parseEffortSummary(effort) || "No effort metadata yet."}</div>
          </div>
          <div className="rounded-md border border-border/70 bg-background/70 p-2 text-[11px] text-muted-foreground">
            Focus the block to edit the structured frontmatter fields.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <Field label="Slug">
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none ring-0 transition focus:border-primary"
                value={effort.slug || ""}
                onChange={(e) => commitEffort({ slug: e.target.value })}
                spellCheck={false}
              />
            </Field>
            <Field label="Label">
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none ring-0 transition focus:border-primary"
                value={effort.label || ""}
                onChange={(e) => commitEffort({ label: e.target.value })}
              />
            </Field>
            <Field label="MET">
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none ring-0 transition focus:border-primary"
                value={effort.met || ""}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  if (!value) return;
                  if (Number.isNaN(Number(value))) return;
                  commitEffort({ met: value });
                }}
              />
            </Field>
            <Field label="Intensity tier">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none ring-0 transition focus:border-primary"
                value={effort.intensityTier || ""}
                onChange={(e) => commitEffort({ intensityTier: e.target.value || undefined })}
              >
                <option value="">Unset</option>
                <option value="low">low</option>
                <option value="moderate">moderate</option>
                <option value="high">high</option>
              </select>
            </Field>
            <Field label="Discipline" className="xl:col-span-2">
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none ring-0 transition focus:border-primary"
                value={effort.discipline || ""}
                onChange={(e) => commitEffort({ discipline: e.target.value })}
              />
            </Field>
            <Field label="Aliases" className="xl:col-span-2">
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none ring-0 transition focus:border-primary"
                value={effort.aliases.join(", ")}
                onChange={(e) => commitEffort({ aliases: parseAliases(e.target.value) })}
                placeholder="comma-separated aliases"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-2 rounded-md border border-border/70 bg-background/70 p-3 text-xs text-muted-foreground md:grid-cols-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide">Record</div>
              <div className="mt-1 font-mono">{effort.id || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide">Source</div>
              <div className="mt-1">{effort.registrySource || "—"}</div>
            </div>
            {effort.createdAt && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide">Created</div>
                <div className="mt-1 font-mono">{effort.createdAt}</div>
              </div>
            )}
            {effort.updatedAt && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide">Updated</div>
                <div className="mt-1 font-mono">{effort.updatedAt}</div>
              </div>
            )}
          </div>

          <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-2 text-[11px] text-muted-foreground">
            Structured fields commit directly into the underlying frontmatter block.
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{
  label: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, className, children }) => (
  <label className={cn("space-y-1.5", className)}>
    <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </Label>
    {children}
  </label>
);

// ── Generic property form (default subtype) ──────────────────────────

type PropertyValue = string | number | string[];
type PropertyType = "text" | "number" | "list";

/** Top-level YAML keys the parser recognizes — same shape as `parseFrontmatter`. */
const PROPERTY_KEY_RE = /^[A-Za-z][\w.-]*$/;

function propertyTypeOf(value: PropertyValue): PropertyType {
  return Array.isArray(value) ? "list" : typeof value === "number" ? "number" : "text";
}

/** Convert a value between editor types; null = refused (would destroy data). */
function convertProperty(value: PropertyValue, next: PropertyType): PropertyValue | null {
  if (propertyTypeOf(value) === next) return null;
  if (next === "list") {
    const scalar = Array.isArray(value) ? value.join(", ") : String(value).trim();
    return scalar === "" ? [] : [scalar];
  }
  const scalar = Array.isArray(value) ? value[0] ?? "" : String(value);
  if (next === "number") {
    const num = Number(scalar);
    return scalar.trim() !== "" && !isNaN(num) ? num : null;
  }
  return Array.isArray(value) ? value.join(", ") : String(value);
}

const propertyInputClass =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none ring-0 transition focus:border-primary";

const DefaultFrontmatterForm: React.FC<{
  section: EditorSection;
  view: EditorView;
  isActive: boolean;
  widthPercent: number;
  rawContent: string;
}> = ({ section, view, isActive, widthPercent, rawContent }) => {
  const entries = useMemo<Array<[string, PropertyValue]>>(
    () => Object.entries(parseFrontmatterBody(rawContent)),
    [rawContent],
  );
  const readOnly = view.state.facet(EditorState.readOnly);
  const compact = !isActive || widthPercent < 24;

  // In-progress edits that are not yet committable (invalid key, partial
  // number, chip text). Keyed by row index; cleared on blur or on commit.
  const [keyDrafts, setKeyDrafts] = useState<Record<number, string>>({});
  const [numDrafts, setNumDrafts] = useState<Record<number, string>>({});
  const [chipDrafts, setChipDrafts] = useState<Record<number, string>>({});
  const [adding, setAdding] = useState<{ key: string; value: string; type: PropertyType } | null>(null);
  // Live mirror of `adding` — deferred blur commits and Enter may race, and
  // a stale closure must never re-commit after the row has been consumed.
  const addingRef = useRef<{ key: string; value: string; type: PropertyType } | null>(null);
  const updateAdding = useCallback((next: { key: string; value: string; type: PropertyType } | null) => {
    addingRef.current = next;
    setAdding(next);
  }, []);

  const commit = useCallback(
    (nextEntries: Array<[string, PropertyValue]>) => {
      const next: ParsedFrontmatter["meta"] = {};
      for (const [k, v] of nextEntries) next[k] = v;
      replaceFrontmatterContent(view, section, serializeFrontmatter(next));
    },
    [view, section],
  );

  const patchEntry = useCallback(
    (index: number, key: string, value: PropertyValue) => {
      commit(entries.map(([k, v], i) => (i === index ? [key, value] : [k, v])));
    },
    [commit, entries],
  );

  const dropDraft = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Record<number, string>>>, index: number) => {
      setter((drafts) => {
        if (!(index in drafts)) return drafts;
        const next = { ...drafts };
        delete next[index];
        return next;
      });
    },
    [],
  );

  const keyIsTaken = useCallback(
    (candidate: string, index: number) => entries.some(([k], i) => i !== index && k === candidate),
    [entries],
  );

  const commitNewProperty = useCallback(() => {
    const draft = addingRef.current;
    if (!draft) return;
    updateAdding(null); // consume first — any racing deferred commit no-ops
    const key = draft.key.trim();
    if (PROPERTY_KEY_RE.test(key) && !keyIsTaken(key, -1)) {
      const trimmed = draft.value.trim();
      let value: PropertyValue = draft.value;
      if (draft.type === "number") {
        value = trimmed !== "" && !isNaN(Number(trimmed)) ? Number(trimmed) : "";
      } else if (draft.type === "list") {
        value = trimmed === "" ? [] : [trimmed];
      }
      commit([...entries, [key, value]]);
    }
  }, [updateAdding, commit, entries, keyIsTaken]);

  return (
    <div className={cn("h-full w-full overflow-auto rounded-l-md border-l border-border bg-popover/95 text-foreground shadow-sm", compact ? "p-2" : "p-3")}>
      <div className="sticky top-0 z-10 -mx-2 -mt-2 mb-3 border-b border-border bg-popover/95 px-2 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Properties
          </span>
          <span className="truncate text-sm font-medium">
            {entries.length === 0 ? "No fields" : `${entries.length} ${entries.length === 1 ? "field" : "fields"}`}
          </span>
        </div>
      </div>

      {compact || readOnly ? (
        <div className="space-y-2 text-xs">
          <div className="space-y-1 rounded-md border border-border/70 bg-background/70 p-2">
            {entries.slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="shrink-0 font-medium text-foreground">{key}:</span>
                <span className="truncate text-muted-foreground">
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </span>
              </div>
            ))}
            {entries.length > 3 && (
              <div className="text-muted-foreground">+{entries.length - 3} more</div>
            )}
            {entries.length === 0 && (
              <div className="text-muted-foreground">No properties yet.</div>
            )}
          </div>
          {!readOnly && (
            <div className="rounded-md border border-border/70 bg-background/70 p-2 text-[11px] text-muted-foreground">
              Focus the block to edit properties.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value], index) => {
            const type = propertyTypeOf(value);
            const keyDraft = keyDrafts[index];
            const keyInvalid = keyDraft !== undefined && (!PROPERTY_KEY_RE.test(keyDraft) || keyIsTaken(keyDraft, index));
            return (
              <div key={index} className="flex items-start gap-1.5">
                <input
                  aria-label="Property name"
                  className={cn(
                    "h-9 w-[110px] shrink-0 rounded-md border bg-background px-2 font-mono text-xs outline-none ring-0 transition",
                    keyInvalid ? "border-destructive" : "border-input focus:border-primary",
                  )}
                  value={keyDraft ?? key}
                  spellCheck={false}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (PROPERTY_KEY_RE.test(next) && !keyIsTaken(next, index)) {
                      dropDraft(setKeyDrafts, index);
                      patchEntry(index, next, value);
                    } else {
                      setKeyDrafts((drafts) => ({ ...drafts, [index]: next }));
                    }
                  }}
                  onBlur={() => dropDraft(setKeyDrafts, index)}
                />

                <div className="min-w-0 flex-1">
                  {type === "list" ? (
                    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 transition focus-within:border-primary">
                      {(value as string[]).map((item, itemIndex) => (
                        <span key={itemIndex} className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                          {item}
                          <button
                            type="button"
                            aria-label={`Remove ${item}`}
                            className="text-muted-foreground/70 transition hover:text-foreground"
                            onClick={() => {
                              const next = (value as string[]).filter((_, j) => j !== itemIndex);
                              patchEntry(index, key, next.length > 0 ? next : "");
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        aria-label={`Add to ${key}`}
                        className="min-w-[72px] flex-1 bg-transparent text-xs outline-none"
                        placeholder="Add item…"
                        value={chipDrafts[index] ?? ""}
                        onChange={(e) => setChipDrafts((drafts) => ({ ...drafts, [index]: e.target.value }))}
                        onKeyDown={(e) => {
                          const draft = (chipDrafts[index] ?? "").trim();
                          if ((e.key === "Enter" || e.key === ",") && draft) {
                            e.preventDefault();
                            dropDraft(setChipDrafts, index);
                            patchEntry(index, key, [...(value as string[]), draft]);
                          } else if (e.key === "Backspace" && !draft && (value as string[]).length > 0) {
                            const list = value as string[];
                            patchEntry(index, key, list.length > 1 ? list.slice(0, -1) : "");
                          }
                        }}
                        onBlur={() => {
                          const draft = (chipDrafts[index] ?? "").trim();
                          dropDraft(setChipDrafts, index);
                          if (draft) patchEntry(index, key, [...(value as string[]), draft]);
                        }}
                      />
                    </div>
                  ) : type === "number" ? (
                    <input
                      aria-label={key}
                      type="number"
                      inputMode="decimal"
                      className={propertyInputClass}
                      value={numDrafts[index] ?? String(value)}
                      onChange={(e) => {
                        const draft = e.target.value;
                        setNumDrafts((drafts) => ({ ...drafts, [index]: draft }));
                        const trimmed = draft.trim();
                        if (trimmed !== "" && !isNaN(Number(trimmed))) {
                          patchEntry(index, key, Number(trimmed));
                        }
                      }}
                      onBlur={(e) => {
                        dropDraft(setNumDrafts, index);
                        if (e.target.value.trim() === "") patchEntry(index, key, "");
                      }}
                    />
                  ) : (
                    <input
                      aria-label={key}
                      className={propertyInputClass}
                      value={String(value)}
                      spellCheck={false}
                      onChange={(e) => patchEntry(index, key, e.target.value)}
                    />
                  )}
                </div>

                <select
                  aria-label={`Type for ${key}`}
                  className="h-9 w-[78px] shrink-0 rounded-md border border-input bg-background px-1.5 text-[11px] text-muted-foreground outline-none ring-0 transition focus:border-primary"
                  value={type}
                  onChange={(e) => {
                    const converted = convertProperty(value, e.target.value as PropertyType);
                    if (converted !== null) patchEntry(index, key, converted);
                  }}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="list">List</option>
                </select>

                <button
                  type="button"
                  aria-label={`Remove ${key}`}
                  className="mt-2 shrink-0 rounded p-1 text-muted-foreground/60 transition hover:bg-muted hover:text-foreground"
                  onClick={() => commit(entries.filter((_, i) => i !== index))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          {adding ? (
            <div
              className="flex items-start gap-1.5"
              onBlur={(e) => {
                // Commit only when focus leaves the whole row. relatedTarget
                // is unreliable (null for mouse-driven focus moves in some
                // browsers), so defer and check where focus actually landed.
                const row = e.currentTarget;
                setTimeout(() => {
                  if (!row.isConnected) return;
                  if (!row.contains(document.activeElement)) commitNewProperty();
                }, 0);
              }}
            >
              <input
                aria-label="New property name"
                autoFocus
                className={cn(
                  "h-9 w-[110px] shrink-0 rounded-md border bg-background px-2 font-mono text-xs outline-none ring-0 transition",
                  adding.key && (!PROPERTY_KEY_RE.test(adding.key.trim()) || keyIsTaken(adding.key.trim(), -1))
                    ? "border-destructive"
                    : "border-input focus:border-primary",
                )}
                placeholder="key"
                value={adding.key}
                spellCheck={false}
                onChange={(e) => updateAdding({ ...adding, key: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitNewProperty();
                  if (e.key === "Escape") updateAdding(null);
                }}
              />
              <input
                aria-label="New property value"
                className={cn(propertyInputClass, "min-w-0 flex-1")}
                placeholder="value"
                value={adding.value}
                spellCheck={false}
                onChange={(e) => updateAdding({ ...adding, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitNewProperty();
                  if (e.key === "Escape") updateAdding(null);
                }}
              />
              <select
                aria-label="New property type"
                className="h-9 w-[78px] shrink-0 rounded-md border border-input bg-background px-1.5 text-[11px] text-muted-foreground outline-none ring-0 transition focus:border-primary"
                value={adding.type}
                onChange={(e) => updateAdding({ ...adding, type: e.target.value as PropertyType })}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="list">List</option>
              </select>
              <button
                type="button"
                aria-label="Cancel new property"
                className="mt-2 shrink-0 rounded p-1 text-muted-foreground/60 transition hover:bg-muted hover:text-foreground"
                onClick={() => updateAdding(null)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border/70 text-[11px] font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
              onClick={() => updateAdding({ key: "", value: "", type: "text" })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add property
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Link sub-component ───────────────────────────────────────────────

const LinkFrontmatterCompanion: React.FC<{
  props: Record<string, string>;
  isActive: boolean;
}> = ({ props, isActive }) => {
  const url = props.source_url || props.website || "";
  const title = props.title || props.label || "Link";
  const compact = !isActive;

  return (
    <div className={cn("h-full w-full flex flex-col bg-popover/90 backdrop-blur-sm border-l border-border overflow-auto", compact ? "p-2" : "p-3")}>
      <div className="flex items-center gap-2 mb-1">
        <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-500">
          Link
        </span>
        <span className="truncate text-xs font-medium">{title}</span>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-2 truncate text-[10px] text-blue-400 hover:underline"
        title={url}
      >
        {url}
      </a>
      {!compact && (
        <div className="rounded-md border border-border/70 bg-background/70 p-2 text-[11px] text-muted-foreground">
          External link preview. Click the URL above to open in a new tab.
        </div>
      )}
    </div>
  );
};

// ── Main component ──────────────────────────────────────────────────

export const FrontmatterCompanion: React.FC<FrontmatterCompanionProps> = ({
  sectionId,
  section: propSection,
  view,
  isActive,
  widthPercent,
  docVersion,
}) => {
  const section = useMemo(
    () => propSection || getSection(view, sectionId),
    [view, sectionId, docVersion, propSection],
  );

  if (!section) return null;

  const rawContent = getSectionInnerContent(view, section);
  const props = useMemo(() => parseFlatProperties(rawContent), [rawContent]);
  const subtype = detectSubtype(props);

  // 1. If it's a dedicated 'embed' section, use its metadata
  if (section.type === "embed" && section.embed) {
    const { type, url, label } = section.embed;
    if (type === "youtube") {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        return (
          <YouTubePlayer
            videoId={videoId}
            title={label}
            isActive={isActive}
          />
        );
      }
    }

    return (
      <div className="h-full w-full flex flex-col bg-popover/90 backdrop-blur-sm border-l border-border p-3 overflow-auto">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase font-bold">
            {section.embed.isImage ? "IMAGE" : "LINK"}
          </span>
          <span className="text-xs font-medium truncate">{label || "Untitled"}</span>
        </div>
        <div className="text-[10px] text-muted-foreground truncate mb-3">{url}</div>
        {section.embed.isImage && (
          <img src={url} alt={label} className="w-full h-auto rounded border border-border shadow-sm bg-muted/20" />
        )}
      </div>
    );
  }

  if (subtype === "effort") {
    return (
      <EffortFrontmatterCompanion
        section={section}
        view={view}
        isActive={isActive}
        widthPercent={widthPercent}
        rawContent={rawContent}
      />
    );
  }

  // 2. Frontmatter YAML parsing for other content (legacy)
  if (subtype === "link") {
    return <LinkFrontmatterCompanion props={props} isActive={isActive} />;
  }

  if (subtype === "youtube") {
    const url = props.url || props.link || "";
    const title = props.title || "YouTube Video";
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      return (
        <YouTubePlayer
          videoId={videoId}
          title={title}
          isActive={isActive}
        />
      );
    }
  }

  // Default: structured property editor for generic frontmatter
  return (
    <DefaultFrontmatterForm
      section={section}
      view={view}
      isActive={isActive}
      widthPercent={widthPercent}
      rawContent={rawContent}
    />
  );
};

// ── YouTube sub-component ────────────────────────────────────────────

const YouTubePlayer: React.FC<{
  videoId: string;
  title: string;
  isActive: boolean;
}> = ({ videoId, title, isActive }) => {
  return (
    <div className={cn("h-full w-full flex flex-col", isActive ? "bg-popover/90 backdrop-blur-sm border-l border-border" : "bg-black")}>
      <div className="relative flex-1 min-h-0">
        <iframe
          className="absolute inset-0 w-full h-full border-0"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      {isActive && title && title !== "YouTube Video" && (
        <div className="px-3 py-1.5 text-xs text-muted-foreground truncate border-t border-border bg-popover/90">
          {title}
        </div>
      )}
    </div>
  );
};
