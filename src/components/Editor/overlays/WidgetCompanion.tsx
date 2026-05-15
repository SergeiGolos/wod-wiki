/**
 * WidgetCompanion
 *
 * Overlay companion rendered for ```widget:<name> ... ``` sections.
 * Looks up the widget name in a registry and renders the matching component
 * with the raw block content (JSON between the fences) parsed as config.
 *
 * Usage in markdown:
 *   ```widget:hero
 *   {"cards":[{"title":"…","body":"…"}]}
 *   ```
 */

import React, { useMemo } from "react";
import type { EditorView } from "@codemirror/view";
import { sectionField } from "../extensions/section-state";
import type { WidgetConfig, WidgetProps, WidgetRegistry } from "../widgets/types";

export type { WidgetConfig, WidgetProps, WidgetRegistry } from "../widgets/types";

// ── Component ────────────────────────────────────────────────────────

export interface WidgetCompanionProps {
  sectionId: string;
  widgetName: string;
  view: EditorView;
  registry: WidgetRegistry;
}

export const WidgetCompanion: React.FC<WidgetCompanionProps> = ({
  sectionId,
  widgetName,
  view,
  registry,
}) => {
  const { rawContent, config } = useMemo(() => {
    const state = view.state.field(sectionField);
    const sec = state.sections.find((s) => s.id === sectionId);
    const raw =
      sec?.contentFrom !== undefined && sec?.contentTo !== undefined
        ? view.state.doc.sliceString(sec.contentFrom, sec.contentTo).trim()
        : "";

    let parsed: WidgetConfig = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        // invalid JSON — pass empty config
      }
    }

    return { rawContent: raw, config: parsed };
  }, [view, sectionId]);

  const WidgetComponent = registry.get(widgetName);

  if (!WidgetComponent) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-l-md border-l border-border bg-muted/60 p-4 text-xs text-muted-foreground">
        <span className="font-mono">widget:{widgetName}</span>
        <span className="ml-2 opacity-60">— not registered</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-l-md border-l border-border bg-background shadow-sm">
      <WidgetComponent
        config={config}
        rawContent={rawContent}
        sectionId={sectionId}
      />
    </div>
  );
};
