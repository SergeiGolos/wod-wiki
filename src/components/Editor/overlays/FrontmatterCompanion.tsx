/**
 * FrontmatterCompanion
 *
 * Overlay companion component for frontmatter sections.
 * Detects the frontmatter subtype (YouTube, Amazon, etc.) and renders
 * the appropriate preview. For YouTube, embeds the video player.
 *
 * Used by the OverlayTrack — renders inside an overlay slot that is:
 *  - 35% width when the cursor is inside the frontmatter (active)
 *  - 100% width when the cursor is elsewhere (inactive)
 */

import React, { useMemo } from "react";
import type { EditorView } from "@codemirror/view";
import { sectionField } from "../extensions/section-state";

// ── Frontmatter helpers ──────────────────────────────────────────────

function parseFrontmatterProps(
  view: EditorView,
  sectionId: string,
): Record<string, string> {
  const { sections } = view.state.field(sectionField);
  const section = sections.find((s) => s.id === sectionId);
  if (!section || section.type !== "frontmatter") return {};

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

interface FrontmatterCompanionProps {
  sectionId: string;
  view: EditorView;
  isActive: boolean;
  widthPercent: number;
  docVersion: number;
}

export const FrontmatterCompanion: React.FC<FrontmatterCompanionProps> = ({
  sectionId,
  view,
  isActive,
  widthPercent,
  docVersion,
}) => {
  const props = useMemo(
    () => parseFrontmatterProps(view, sectionId),
    // docVersion ensures we re-parse when frontmatter content changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, sectionId, docVersion],
  );
  const subtype = useMemo(() => detectSubtype(props), [props]);

  if (subtype === "youtube") {
    return (
      <YouTubeCompanion
        props={props}
        isActive={isActive}
        widthPercent={widthPercent}
      />
    );
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

interface YouTubeCompanionProps {
  props: Record<string, string>;
  isActive: boolean;
  widthPercent: number;
}

const YouTubeCompanion: React.FC<YouTubeCompanionProps> = ({
  props,
  isActive,
}) => {
  const url = props["url"] || props["link"] || "";
  const title = props["title"] || "YouTube Video";
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-popover/90 backdrop-blur-sm border-l border-border text-xs text-muted-foreground">
        No valid YouTube URL
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full flex flex-col ${
        isActive
          ? "bg-popover/90 backdrop-blur-sm border-l border-border"
          : "bg-black"
      }`}
    >
      {/* 16:9 video container that fills available space */}
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
      {/* Title bar — only when active (side panel mode) */}
      {isActive && title !== "YouTube Video" && (
        <div className="px-3 py-1.5 text-xs text-muted-foreground truncate border-t border-border bg-popover/90">
          {title}
        </div>
      )}
    </div>
  );
};
