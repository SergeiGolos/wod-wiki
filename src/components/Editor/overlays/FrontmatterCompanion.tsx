/**
 * FrontmatterCompanion
 *
 * Overlay companion component for frontmatter and embed sections.
 * Detects the subtype (YouTube, Amazon, effort, etc.) and renders
 * the appropriate preview. For effort frontmatter, renders structured
 * controls that write back to the underlying YAML/frontmatter source.
 */

import React, { useCallback, useMemo } from "react";
import type { EditorView } from "@codemirror/view";
import { sectionField, type EditorSection } from "../extensions/section-state";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// ── Types ────────────────────────────────────────────────────────────

type FrontmatterSubtype = "youtube" | "amazon" | "strava" | "effort" | "default";

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

function parseFlatProperties(innerContent: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const line of innerContent.split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      props[match[1].trim()] = match[2].trim();
    }
  }
  return props;
}

function parseYamlScalar(val: string): string {
  const trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return trimmed;
}

function quoteYaml(val: string): string {
  if (!val) return '""';
  if (/[":'\n#{}\[\],&*?\|\-<>=%!@`]/.test(val) || val !== val.trim()) {
    return `"${val.replace(/"/g, '\\"')}"`;
  }
  return val;
}

function detectSubtype(props: Record<string, string>): FrontmatterSubtype {
  const typeValue = (props.type || "").toLowerCase();
  if (typeValue === "youtube") return "youtube";
  if (typeValue === "amazon") return "amazon";
  if (typeValue === "strava") return "strava";
  if (typeValue === "effort") return "effort";

  const url = props.url || props.link || "";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/amazon\.com|amzn\.to/i.test(url)) return "amazon";
  if (/strava\.com/i.test(url)) return "strava";

  // Effort frontmatter uses a predictable metadata envelope. We support both
  // canonical nested docs (baseAttributes / registrySource) and the legacy flat
  // effort files (met / discipline / intensityTier at root).
  if (
    props.registrySource !== undefined ||
    props.baseAttributes !== undefined ||
    props.met !== undefined ||
    props.discipline !== undefined ||
    props.intensityTier !== undefined
  ) {
    return "effort";
  }

  return "default";
}

function extractYouTubeVideoId(url: string): string | null {
  const standard = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (standard) return standard[1];
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return short[1];
  const embed = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embed) return embed[1];
  return null;
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
        case "met":
          data.met = value;
          break;
        case "discipline":
          data.discipline = value;
          break;
        case "intensityTier":
          data.intensityTier = value;
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

  // Default: show a simple properties summary
  return (
    <div className="h-full w-full flex flex-col bg-popover/90 backdrop-blur-sm border-l border-border p-3 overflow-auto">
      <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
        Frontmatter
      </div>
      {Object.entries(props).map(([key, val]) => (
        <div key={key} className="text-xs mb-1">
          <span className="font-medium text-foreground">{key}:</span>{" "}
          <span className="text-muted-foreground">{val}</span>
        </div>
      ))}
    </div>
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
