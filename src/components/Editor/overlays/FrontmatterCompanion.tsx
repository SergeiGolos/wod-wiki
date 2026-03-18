/**
 * FrontmatterCompanion
 *
 * Overlay companion component for frontmatter and embed sections.
 * Detects the subtype (YouTube, Amazon, etc.) and renders
 * the appropriate preview. For YouTube, embeds the video player.
 */

import React, { useMemo } from "react";
import type { EditorView } from "@codemirror/view";
import { sectionField, EditorSection } from "../extensions/section-state";

// ── Helpers ──────────────────────────────────────────────────────────

function getSection(view: EditorView, sectionId: string): EditorSection | undefined {
  const { sections } = view.state.field(sectionField);
  return sections.find((s) => s.id === sectionId);
}

function parseFrontmatter(view: EditorView, section: EditorSection): Record<string, string> {
  if (section.type !== "frontmatter") return {};

  const props: Record<string, string> = {};
  const doc = view.state.doc;
  for (let ln = section.startLine + 1; ln < section.endLine; ln++) {
    const line = doc.line(ln).text;
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      props[match[1].trim()] = match[2].trim();
    }
  }
  return props;
}

type FrontmatterSubtype = "youtube" | "amazon" | "strava" | "default";

function detectSubtype(props: Record<string, string>): FrontmatterSubtype {
  const typeValue = (props["type"] || "").toLowerCase();
  if (typeValue === "youtube") return "youtube";
  if (typeValue === "amazon") return "amazon";
  if (typeValue === "strava") return "strava";

  const url = props["url"] || props["link"] || "";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/amazon\.com|amzn\.to/i.test(url)) return "amazon";
  if (/strava\.com/i.test(url)) return "strava";

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

// ── Component ────────────────────────────────────────────────────────

export interface FrontmatterCompanionProps {
  sectionId: string;
  section?: EditorSection;
  view: EditorView;
  isActive: boolean;
  widthPercent: number;
  docVersion: number;
}

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

  // 2. Fallback to Frontmatter YAML parsing (legacy)
  const props = section.type === "frontmatter" ? parseFrontmatter(view, section) : {};
  const subtype = detectSubtype(props);

  if (subtype === "youtube") {
    const url = props["url"] || props["link"] || "";
    const title = props["title"] || "YouTube Video";
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
    <div className={`h-full w-full flex flex-col ${isActive ? "bg-popover/90 backdrop-blur-sm border-l border-border" : "bg-black"}`}>
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
