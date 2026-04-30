/**
 * InlineCommandBar
 *
 * Lightweight command buttons rendered at the opening fence of each WOD block
 * when enableOverlay is false.  This ensures Run / Playground / Plan buttons
 * remain accessible even without the full overlay panel.
 *
 * Uses the sectionField (already in the editor state) and section-geometry
 * rects to position a floating toolbar at the top-right of each WOD section.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import type { EditorView } from "@codemirror/view";
import { sectionField, type EditorSection } from "../extensions/section-state";
import { sectionGeometry as sectionGeometryPlugin, type SectionRect } from "../extensions/section-geometry";
import type { WodCommand } from "./WodCommand";
import type { WodBlock } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/ButtonGroup";
import type { INavActivation } from "@/nav/navTypes";

// ── Helpers ──────────────────────────────────────────────────────────

/** Build a WodBlock from section data (matches WodCompanion's buildWodBlock). */
function buildWodBlock(view: EditorView, section: EditorSection): WodBlock {
  const content =
    section.contentFrom !== undefined && section.contentTo !== undefined
      ? view.state.doc.sliceString(section.contentFrom, section.contentTo)
      : "";
  return {
    id: section.id,
    dialect: section.dialect || "wod",
    startLine: section.startLine - 1,
    endLine: section.endLine - 1,
    content,
    state: "idle",
    version: 1,
    createdAt: Date.now(),
    widgetIds: {},
  };
}

// ── Icon adapter ─────────────────────────────────────────────────────

/**
 * Wraps a ReactNode icon into a ComponentType compatible with INavActivation.
 * If the node is a cloneable React element, the className from ButtonGroup is
 * merged in so icon sizing/color remain controllable.
 */
function wrapNodeAsIcon(
  node: React.ReactNode,
): React.ComponentType<{ className?: string }> {
  return function WrappedIcon({ className }: { className?: string }) {
    if (React.isValidElement(node)) {
      return React.cloneElement(
        node as React.ReactElement<{ className?: string }>,
        { className: cn((node.props as { className?: string }).className, className) },
      );
    }
    return <span className={cn("flex items-center", className)}>{node}</span>;
  };
}

// ── CommandPill ──────────────────────────────────────────────────────

const CommandPill: React.FC<{
  cmd: WodCommand;
  block: WodBlock;
}> = ({ cmd, block }) => {
  const [splitOk, setSplitOk] = useState(false);

  const handleSplitAction = useCallback(async () => {
    if (!cmd.onSplitClick || splitOk) return;
    await cmd.onSplitClick(block);
    setSplitOk(true);
    setTimeout(() => setSplitOk(false), 1500);
  }, [cmd, block, splitOk]);

  const PrimaryIcon = useMemo(() => wrapNodeAsIcon(cmd.icon), [cmd.icon]);
  const SplitIcon = useMemo(
    () =>
      splitOk
        ? wrapNodeAsIcon(cmd.splitSuccessIcon ?? cmd.splitIcon)
        : wrapNodeAsIcon(cmd.splitIcon),
    [splitOk, cmd.splitIcon, cmd.splitSuccessIcon],
  );

  const primaryActivation = useMemo<INavActivation>(
    () => ({
      id: cmd.id,
      label: cmd.label,
      icon: PrimaryIcon,
      action: { type: "call", handler: () => cmd.onClick(block) },
    }),
    [cmd, block, PrimaryIcon],
  );

  const secondaryActivation = useMemo<INavActivation>(
    () => ({
      id: `${cmd.id}-split`,
      label: "Copy link",
      icon: SplitIcon,
      action: { type: "call", handler: handleSplitAction },
    }),
    [cmd.id, SplitIcon, handleSplitAction],
  );

  const stopEvent = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Standalone button — no split action
  if (!cmd.onSplitClick) {
    return (
      <Button
        variant={cmd.primary ? "default" : "secondary"}
        className={cn(
          "h-auto px-2 py-0.5 text-[10px] font-medium rounded-sm shadow-sm gap-1",
          !cmd.primary && "border border-border/50",
        )}
        title={cmd.label}
        data-testid={cmd.id === 'run' ? 'editor-start-workout' : undefined}
        onClick={(e) => {
          stopEvent(e);
          cmd.onClick(block);
        }}
        onMouseDown={stopEvent}
        onPointerDown={stopEvent}
      >
        <span className="flex items-center size-3">{cmd.icon}</span>
        <span className="hidden sm:inline">{cmd.label}</span>
      </Button>
    );
  }

  // Split button: primary action + secondary icon via ButtonGroup
  return (
    <div
      onClick={stopEvent}
      onMouseDown={stopEvent}
      onPointerDown={stopEvent}
    >
      <ButtonGroup
        primary={primaryActivation}
        secondary={secondaryActivation}
        size="xs"
        variant={cmd.primary ? "primary" : "default"}
        className="rounded-sm"
        labelClassName="hidden sm:inline"
      />
    </div>
  );
};

// ── InlineCommandBar ─────────────────────────────────────────────────

interface InlineCommandBarProps {
  /** The CodeMirror EditorView instance */
  view: EditorView | null;
  /** Command definitions (Run, Playground, Plan, …) */
  commands: WodCommand[];
}

/**
 * Renders a floating command bar at the top-right of every WOD section.
 *
 * The component listens to section-geometry updates (which fire on scroll,
 * viewport change, and document change) and positions one toolbar per WOD
 * block.
 */
export const InlineCommandBar: React.FC<InlineCommandBarProps> = ({
  view,
  commands,
}) => {
  const [rects, setRects] = useState<SectionRect[]>([]);
  const [scrollTop, setScrollTop] = useState(0);

  // Subscribe to geometry changes from the CM6 plugin
  useEffect(() => {
    if (!view) return;

    const plugin = view.plugin(sectionGeometryPlugin);
    if (!plugin) return;

    // addListener delivers current rects immediately and returns an unsubscribe fn
    // Second arg (docVersion) is unused here — only rects are needed.
    const unsubscribe = plugin.addListener((newRects: SectionRect[]) =>
      setRects([...newRects]),
    );
    return unsubscribe;
  }, [view]);

  // Track cm-scroller scroll to compensate rect.top (document-space) for scroll offset.
  // RAF-throttled to prevent a setState on every scroll pixel.
  useEffect(() => {
    if (!view) return;
    const scroller = view.scrollDOM;
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setScrollTop(scroller.scrollTop);
      });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    setScrollTop(scroller.scrollTop);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      scroller.removeEventListener('scroll', onScroll);
    };
  }, [view]);

  if (!view || commands.length === 0) return null;

  // Only render for WOD sections
  const wodRects = rects.filter((r) => r.type === "wod");

  if (wodRects.length === 0) return null;

  // Look up sections from the view state for block data
  const { sections } = view.state.field(sectionField);
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  return (
    <>
      {wodRects.map((rect) => {
        const section = sectionMap.get(rect.sectionId);
        if (!section) return null;

        const block = buildWodBlock(view, section);

        return (
          <div
            key={rect.sectionId}
            className="absolute right-1 z-10 flex items-center gap-1 pointer-events-auto"
            style={{
              // rect.top is document-space; subtract scrollTop to get the correct
              // position relative to .cm-note-editor as the editor scrolls.
              top: rect.top - scrollTop + 2,
            }}
          >
            {commands.map((cmd) => (
              <CommandPill key={cmd.id} cmd={cmd} block={block} />
            ))}
          </div>
        );
      })}
    </>
  );
};

export default InlineCommandBar;
