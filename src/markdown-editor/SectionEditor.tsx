/**
 * SectionEditor
 * 
 * Top-level component that renders a markdown document as a list of
 * styled section components with continuous line numbers.
 * 
 * Phase 2: Sections are editable. Clicking a section activates an
 * inline editor (textarea for title/markdown, Monaco for WOD blocks).
 * Content changes flow back through useSectionDocument.
 */

import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import type { WodBlock } from './types';
import type { Section, SectionType, WodDialect } from './types/section';
import { useSectionDocument } from './hooks/useSectionDocument';
import { SectionContainer } from './components/SectionContainer';
import { MarkdownDisplay, WodBlockDisplay } from './components/section-renderers';
import { SectionEditView } from './components/SectionEditView';
import { WodSectionEditor } from './components/WodSectionEditor';
import { SectionAddBar, type NewSectionType } from './components/SectionAddBar';
import { SectionSeparator } from './components/SectionSeparator';
import type { IContentProvider } from '@/types/content-provider';

export interface SectionEditorProps {
  /** Initial markdown content */
  initialContent?: string;
  /** Controlled content */
  value?: string;
  /** Initial sections (for segment-based initialization) */
  initialSections?: Section[];
  /** Content change callback */
  onContentChange?: (content: string) => void;
  /** Block change callback (for workbench integration) */
  onBlocksChange?: (blocks: WodBlock[]) => void;
  /** Active block change callback */
  onActiveBlockChange?: (block: WodBlock | null) => void;
  /** Start workout callback */
  onStartWorkout?: (block: WodBlock) => void;
  /** Add to plan callback (template mode) */
  onAddToPlan?: (block: WodBlock) => void;
  /** Section click callback */
  onSectionClick?: (section: Section) => void;
  /** Height */
  height?: string | number;
  /** Width */
  width?: string | number;
  /** CSS class */
  className?: string;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Whether editing is enabled (default true) */
  editable?: boolean;
  /** Viewing mode (preview vs template) */
  mode?: 'preview' | 'template';
  /** Provider for history/persistence (needed for WOD block "Add to Plan") */
  provider?: IContentProvider;
  /** ID of the note being edited/viewed (for link tracking) */
  sourceNoteId?: string;
  /**
   * Optional list of section types to display.
   * When set, only sections whose `type` is in this array are rendered.
   * Sections not matching the filter are completely hidden.
   */
  /**
   * Optional list of section types to display.
   * When set, only sections whose `type` is in this array are rendered.
   * Sections not matching the filter are completely hidden.
   */
  filter?: SectionType[];
  /**
   * Optional class name for the inner content container.
   * Use this to control padding/width of the content while keeping the scrollbar at the edge.
   */
  contentClassName?: string;
}

/** Read-only dispatcher — selects renderer by section type */
const SectionDisplayRenderer: React.FC<{
  section: Section;
  onStartWorkout?: (block: WodBlock) => void;
  onAddToPlan?: (block: WodBlock) => void;
  provider?: IContentProvider;
  sourceNoteId?: string;
  mode?: 'preview' | 'template';
}> = ({ section, onStartWorkout, onAddToPlan, provider, sourceNoteId, mode }) => {
  switch (section.type) {
    case 'title':
    case 'markdown':
      return <MarkdownDisplay section={section} />;
    case 'wod':
      return (
        <WodBlockDisplay
          section={section}
          onStartWorkout={onStartWorkout}
          onAddToPlan={onAddToPlan}
          provider={provider}
          sourceNoteId={sourceNoteId}
          mode={mode}
        />
      );
    default:
      return null;
  }
};

export const SectionEditor: React.FC<SectionEditorProps> = ({
  initialContent = '',
  initialSections,
  value,
  onContentChange,
  onBlocksChange,
  onActiveBlockChange,
  onStartWorkout,
  onSectionClick,
  height = '100%',
  width = '100%',
  className = '',
  showLineNumbers = true,
  editable = true,
  onAddToPlan,
  mode = 'preview',
  provider,
  sourceNoteId,
  filter,
  contentClassName,
}) => {
  const {
    sections,
    totalLines,
    activeSectionId,
    activateSection,
    deactivateSection,
    pendingCursorPosition,
    updateSectionContent,
    insertSectionAfter,
    prependSection,
    deleteSection: _deleteSection,
    splitSection,
    convertToWod,
    softDeleteSection: _softDeleteSection,
    wodBlocks,
  } = useSectionDocument({
    initialContent,
    initialSections,
    value,
    onContentChange,
  });

  // Notify parent of block changes
  React.useEffect(() => {
    onBlocksChange?.(wodBlocks);
  }, [wodBlocks, onBlocksChange]);

  // Keep a ref to latest sections for use in async callbacks
  const sectionsRef = useRef(sections);
  useEffect(() => { sectionsRef.current = sections; }, [sections]);

  // Compute gutter width from total line count digit count
  const gutterWidth = showLineNumbers ? Math.max(2, String(totalLines).length) : 0;

  // Handle adding a new section at a specific position (or bottom if no afterId)
  const handleAddSection = useCallback((type: NewSectionType, afterId?: string) => {
    // If no afterId is provided and we have sections, default to the last one.
    // If afterId is explicitly 'START', we prepend.
    const isPrepend = afterId === 'START';
    const targetAfterId = !isPrepend ? (afterId || (sections.length > 0 ? sections[sections.length - 1].id : undefined)) : undefined;

    switch (type) {
      case 'markdown':
        if (isPrepend) prependSection('');
        else if (targetAfterId) insertSectionAfter(targetAfterId, '');
        else onContentChange?.('');
        break;
      case 'wod':
      case 'log':
      case 'plan': {
        const dialect: WodDialect = type as WodDialect;
        if (isPrepend) {
          prependSection('');
          setTimeout(() => {
            const latest = sectionsRef.current;
            if (latest.length > 0) {
              convertToWod(latest[0].id, '', '', dialect);
            }
          }, 0);
        } else if (targetAfterId) {
          // Insert a blank markdown section, then immediately convert to wod with dialect
          insertSectionAfter(targetAfterId, '');
          setTimeout(() => {
            const latest = sectionsRef.current;
            const afterIdx = latest.findIndex(s => s.id === targetAfterId);
            if (afterIdx !== -1 && afterIdx + 1 < latest.length) {
              convertToWod(latest[afterIdx + 1].id, '', '', dialect);
            }
          }, 0);
        } else {
          onContentChange?.(`\`\`\`${dialect}\n\n\`\`\``);
        }
        break;
      }
    }
  }, [sections, insertSectionAfter, prependSection, convertToWod, onContentChange]);

  // Handle section click → activate for editing
  const handleSectionClick = useCallback((sectionId: string, clickPosition: { line: number; column: number }) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Notify parent about section click
    onSectionClick?.(section);

    // Notify about active block change
    if (section.wodBlock) {
      onActiveBlockChange?.(section.wodBlock);
    } else {
      onActiveBlockChange?.(null);
    }

    // Activate for editing (if editable)
    if (editable) {
      activateSection(sectionId, clickPosition);
    }
  }, [sections, activateSection, onSectionClick, onActiveBlockChange, editable]);

  // Handle boundary navigation between sections
  const handleBoundaryReached = useCallback((currentSectionId: string, boundary: 'top' | 'bottom') => {
    const currentIndex = sections.findIndex(s => s.id === currentSectionId);
    if (currentIndex === -1) return;

    if (boundary === 'top' && currentIndex > 0) {
      const prevSection = sections[currentIndex - 1];
      activateSection(prevSection.id, {
        line: prevSection.lineCount - 1, // Last line of previous section
        column: 0,
      });
    }

    if (boundary === 'bottom') {
      if (currentIndex < sections.length - 1) {
        // Navigate to next existing section
        const nextSection = sections[currentIndex + 1];
        activateSection(nextSection.id, {
          line: 0, // First line of next section
          column: 0,
        });
      }
      // If at the last section, do nothing (don't auto-create a new one)
    }
  }, [sections, activateSection, insertSectionAfter]);

  // Handle new section request (Enter on empty trailing line)
  const handleNewSectionRequest = useCallback((afterSectionId: string) => {
    insertSectionAfter(afterSectionId, '');
  }, [insertSectionAfter]);

  // Render a section — either display or edit view
  const renderSectionContent = useCallback((section: Section, isActive: boolean) => {
    if (!isActive || !editable) {
      return (
        <SectionDisplayRenderer
          section={section}
          onStartWorkout={onStartWorkout}
          onAddToPlan={onAddToPlan}
          provider={provider}
          sourceNoteId={sourceNoteId}
          mode={mode}
        />
      );
    }

    // Active section → render inline editor
    if (section.type === 'wod') {
      return (
        <WodSectionEditor
          section={section}
          onChange={(newContent) => updateSectionContent(section.id, newContent)}
          lineNumberOffset={section.startLine}
          initialCursorPosition={pendingCursorPosition ?? undefined}
          onBoundaryReached={(boundary) => handleBoundaryReached(section.id, boundary)}
          onDeactivate={deactivateSection}
          onStartWorkout={onStartWorkout}
        />
      );
    }

    // Title, markdown → textarea editor
    return (
      <SectionEditView
        section={section}
        sectionType={section.type}
        onChange={(newContent) => updateSectionContent(section.id, newContent)}
        initialCursorPosition={pendingCursorPosition ?? undefined}
        onBoundaryReached={(boundary) => handleBoundaryReached(section.id, boundary)}
        onNewSectionRequest={() => handleNewSectionRequest(section.id)}
        onDeactivate={deactivateSection}
        onSplitSection={(before, after) => splitSection(section.id, before, after)}
        onConvertToWod={(contentBefore, contentAfterFence, dialect) => convertToWod(section.id, contentBefore, contentAfterFence, dialect)}
      />
    );
  }, [
    editable,
    onStartWorkout,
    pendingCursorPosition,
    updateSectionContent,
    handleBoundaryReached,
    handleNewSectionRequest,
    deactivateSection,
    splitSection,
    convertToWod,
  ]);

  // Apply filter if provided (e.g. only 'wod' sections on Track view)
  const visibleSections = useMemo(() => {
    const live = sections.filter(s => !s.deleted);
    if (!filter || filter.length === 0) return live;
    return live.filter(s => filter.includes(s.type));
  }, [sections, filter]);

  return (
    <div
      className={`section-editor overflow-auto custom-scrollbar cursor-default ${className}`}
      style={{ height, width }}
    >
      <div className={contentClassName || "py-2"}>
        {visibleSections.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground text-center italic">
            {filter ? 'No matching sections found.' : 'Empty document. Click below to add your first segment.'}
          </div>
        ) : (
          <>

            {visibleSections.map((section) => {
              const isActive = section.id === activeSectionId;
              return (
                <React.Fragment key={section.id}>
                  <SectionContainer
                    section={section}
                    startLineNumber={section.startLine + 1}
                    gutterWidth={gutterWidth}
                    isActive={isActive}
                    onClick={handleSectionClick}
                    onDelete={(editable && mode !== 'template') ? (id) => _softDeleteSection(id) : undefined}
                  >
                    {renderSectionContent(section, isActive)}
                  </SectionContainer>

                  {editable && (
                    <SectionSeparator
                      onAdd={(type) => handleAddSection(type, section.id)}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* Add at top or bottom if empty */}
        {editable && sections.length === 0 && (
          <div className="px-4 py-2 border-t border-border/40 mt-4">
            <SectionAddBar onAdd={handleAddSection} />
          </div>
        )}
      </div>
    </div>
  );
};
