/**
 * useSectionDocument Hook
 * 
 * Central state management hook for the section-based editor.
 * Parses raw markdown content into sections and provides methods
 * for activating, editing, and navigating sections.
 * 
 * Phase 2: Full editing support — activate/deactivate sections,
 * update content, insert/delete sections with debounced reconciliation.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Section } from '../types/section';
import type { WodBlock } from '../types';
import { parseDocumentSections, buildRawContent, calculateTotalLines, matchSectionIds, extractMetadata } from '../utils/sectionParser';
import { detectWodBlocks } from '../utils/blockDetection';
import { parseWodBlock } from '../utils/parseWodBlock';
import { sharedParser } from '../../parser/parserInstance';
import { v4 as uuidv4 } from 'uuid';

export interface UseSectionDocumentOptions {
  /** Initial markdown content */
  initialContent: string;
  /** Initial sections (for segment-based model) */
  initialSections?: Section[];
  /** Controlled content (overrides internal state when provided) */
  value?: string;
  /** Called when content changes */
  onContentChange?: (content: string) => void;
}

export interface UseSectionDocumentReturn {
  /** Current section list */
  sections: Section[];
  /** Total line count */
  totalLines: number;
  /** Currently active (editing) section ID */
  activeSectionId: string | null;

  /** Activate a section for editing */
  activateSection: (sectionId: string, cursorPosition?: { line: number; column: number }) => void;
  /** Deactivate the current section (flush pending edits) */
  deactivateSection: () => void;
  /** Pending cursor position for newly activated section */
  pendingCursorPosition: { line: number; column: number } | null;

  /** Update the content of a section (debounced reconciliation) */
  updateSectionContent: (sectionId: string, newContent: string) => void;
  /** Insert a new section after the given section */
  insertSectionAfter: (afterSectionId: string, content: string) => void;
  /** Delete a section and merge content with the preceding section */
  deleteSection: (sectionId: string) => void;
  /** Split a section at cursor — update current with beforeContent, create new section with afterContent */
  splitSection: (sectionId: string, beforeContent: string, afterContent: string) => void;
  /** Convert a paragraph into a WOD block — optionally keeping content before the fence in the paragraph */
  convertToWod: (sectionId: string, contentBefore: string, wodBodyContent: string) => void;

  /** The full raw content (source of truth) */
  rawContent: string;

  /** WOD blocks extracted from sections */
  wodBlocks: WodBlock[];
}

/** Debounce delay for reconciliation (ms) */
const RECONCILE_DEBOUNCE_MS = 300;

export function useSectionDocument(options: UseSectionDocumentOptions): UseSectionDocumentReturn {
  const { initialContent, initialSections, value, onContentChange } = options;

  // Initialize from initialSections or parse initialContent
  const initialData = useMemo(() => {
    if (initialSections && initialSections.length > 0) {
      return {
        sections: initialSections,
        rawContent: buildRawContent(initialSections)
      };
    }
    const parsedSections = parseDocumentSections(initialContent);
    return {
      sections: parsedSections,
      rawContent: buildRawContent(parsedSections)
    };
  }, [initialContent, initialSections]);

  // Content state
  const [rawContent, setRawContent] = useState(value ?? initialData.rawContent);

  // Active section state
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [pendingCursorPosition, setPendingCursorPosition] = useState<{ line: number; column: number } | null>(null);

  // Debounce timer for reconciliation
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to hold latest sections for use in callbacks without stale closures
  const sectionsRef = useRef<Section[]>([]);

  // Sync controlled value
  useEffect(() => {
    if (value !== undefined && value !== rawContent) {
      setRawContent(value);
    }
  }, [value]);

  // Detect and parse WOD blocks
  const wodBlocks = useMemo(() => {
    const detected = detectWodBlocks(rawContent);
    // Parse each block to populate statements/errors
    return detected.map(block => {
      if (!block.content || block.content.trim().length === 0) {
        return { ...block, statements: [], errors: [], state: 'parsed' as const };
      }
      try {
        const result = parseWodBlock(block.content, sharedParser);
        return {
          ...block,
          statements: result.statements,
          errors: result.errors,
          state: (result.success ? 'parsed' : 'error') as any,
        };
      } catch (error: any) {
        return {
          ...block,
          statements: [],
          errors: [{ message: error?.message || 'Unknown parse error', severity: 'error' as const }],
          state: 'error' as any,
        };
      }
    });
  }, [rawContent]);

  // Initialize sections state from initialData but allow state updates
  const [sections, setSections] = useState<Section[]>(initialData.sections);

  // Parse sections from raw content (when rawContent changes externally or via local edits)
  useEffect(() => {
    // Only parse if rawContent has actually changed from what we already have in sections
    const currentRaw = buildRawContent(sections);
    if (rawContent !== currentRaw) {
      // Note: In segment-first mode, we usually update sections directly, 
      // which then updates rawContent. This path is for EXTERNAL updates (value prop).
      const wodBlocksForParse = detectWodBlocks(rawContent).map(block => {
        try {
          const result = parseWodBlock(block.content, sharedParser);
          return {
            ...block,
            statements: result.statements,
            errors: result.errors,
            state: (result.success ? 'parsed' : 'error') as any,
          };
        } catch {
          return block;
        }
      });
      const newSections = parseDocumentSections(rawContent, wodBlocksForParse);
      const stabilized = sections.length > 0
        ? matchSectionIds(sections, newSections)
        : newSections;
      setSections(stabilized);
    }
  }, [rawContent]);

  // Keep refs in sync
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  // Total lines
  const totalLines = useMemo(() => calculateTotalLines(sections), [sections]);

  // Flush any pending reconciliation
  const flushReconcile = useCallback(() => {
    if (reconcileTimerRef.current) {
      clearTimeout(reconcileTimerRef.current);
      reconcileTimerRef.current = null;
    }
  }, []);

  /**
   * Rebuild rawContent from the current sections array and notify parent.
   * This is the core reconciliation step.
   */
  const reconcileFromSections = useCallback((currentSections: Section[]) => {
    const newRawContent = buildRawContent(currentSections);
    setRawContent(newRawContent);
    onContentChange?.(newRawContent);
  }, [onContentChange]);

  // Deactivate section — flush pending edits
  const deactivateSection = useCallback(() => {
    if (!activeSectionId) return;

    flushReconcile();
    setActiveSectionId(null);
    setPendingCursorPosition(null);
  }, [activeSectionId, flushReconcile]);

  // Activate a section for editing
  const activateSection = useCallback((sectionId: string, cursorPosition?: { line: number; column: number }) => {
    // If switching sections, flush any pending edits from the previous section
    if (activeSectionId && activeSectionId !== sectionId) {
      deactivateSection(); // Ensure previous section is processed
    }

    setActiveSectionId(sectionId);
    setPendingCursorPosition(cursorPosition ?? null);
  }, [activeSectionId, deactivateSection]);

  /**
   * Update the content of a specific section.
   * Applies the change locally for responsive UI, then schedules
   * a debounced full reconciliation.
   */
  const updateSectionContent = useCallback((sectionId: string, newContent: string) => {
    // Update the sections array in place for immediate UI feedback
    const updatedSections = sectionsRef.current.map(s => {
      if (s.id !== sectionId) return s;

      let cleanForUpdate = extractMetadata(newContent).cleanText;

      // Promote paragraph → heading when user types # at the start
      if (s.type === 'paragraph') {
        const firstLine = cleanForUpdate.split('\n')[0];
        const headingMatch = firstLine.trim().match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          // Convert to heading — take only the first line
          return {
            ...s,
            type: 'heading' as const,
            rawContent: firstLine,
            displayContent: headingMatch[2],
            level: headingMatch[1].length,
            lineCount: 1,
            endLine: s.startLine,
          };
        }
      }

      // Enforce single-line constraint for headers
      if (s.type === 'heading') {
        const lines = cleanForUpdate.split('\n');
        if (lines.length > 1) {
          cleanForUpdate = lines[0]; // Only take first line
        }
      }

      const newLineCount = cleanForUpdate.split('\n').length;

      const updatedSection: Section = {
        ...s,
        rawContent: cleanForUpdate, // Store clean content while editing
        displayContent: cleanForUpdate,
        lineCount: newLineCount,
        endLine: s.startLine + newLineCount - 1,
      };

      // For headings, update displayContent level or demote to paragraph
      if (s.type === 'heading' || updatedSection.type === 'heading') {
        const match = cleanForUpdate.trim().match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          updatedSection.displayContent = match[2];
          updatedSection.level = match[1].length;
        } else {
          // No longer a heading — demote to paragraph
          updatedSection.type = 'paragraph';
          updatedSection.level = undefined;
          updatedSection.displayContent = cleanForUpdate;
        }
      }

      return updatedSection;
    });

    // Recompute startLine/endLine for all subsequent sections
    let currentLine = 0;
    for (const section of updatedSections) {
      section.startLine = currentLine;
      section.endLine = currentLine + section.lineCount - 1;
      currentLine = section.endLine + 1;
    }

    // Store updated sections for reconciliation
    sectionsRef.current = updatedSections;

    // Rebuild rawContent immediately for responsive UI
    const newRawContent = buildRawContent(updatedSections);
    setRawContent(newRawContent);

    // Schedule debounced notification to parent
    if (reconcileTimerRef.current) {
      clearTimeout(reconcileTimerRef.current);
    }
    reconcileTimerRef.current = setTimeout(() => {
      onContentChange?.(newRawContent);
      reconcileTimerRef.current = null;
    }, RECONCILE_DEBOUNCE_MS);
  }, [onContentChange]);

  /**
   * Insert a new empty section after the specified section.
   * Used when the user presses Enter on an empty trailing line.
   */
  const insertSectionAfter = useCallback((afterSectionId: string, content: string) => {
    const currentSections = [...sectionsRef.current];
    const afterIndex = currentSections.findIndex(s => s.id === afterSectionId);
    if (afterIndex === -1) return;

    const afterSection = currentSections[afterIndex];

    // Remove trailing empty line from the current section if it exists
    if (afterSection.rawContent.endsWith('\n')) {
      afterSection.rawContent = afterSection.rawContent.slice(0, -1);
      afterSection.lineCount = afterSection.rawContent.split('\n').length;
      afterSection.endLine = afterSection.startLine + afterSection.lineCount - 1;
    }

    // Determine type from content (# prefix = heading)
    const newStartLine = afterSection.endLine + 1;
    const now = Date.now();
    const newId = uuidv4();
    const sectionContent = content || '';
    const headingMatch = sectionContent.trim().match(/^(#{1,6})\s+(.*)$/);

    let sectionType: 'heading' | 'paragraph' = 'paragraph';
    let displayContent = sectionContent;
    let level: number | undefined;

    if (headingMatch) {
      sectionType = 'heading';
      displayContent = headingMatch[2];
      level = headingMatch[1].length;
    }

    const contentLineCount = sectionType === 'heading' ? 1 : sectionContent.split('\n').length;

    const newSection: Section = {
      id: newId,
      type: sectionType,
      rawContent: sectionContent,
      displayContent,
      startLine: newStartLine,
      endLine: newStartLine + contentLineCount - 1,
      lineCount: contentLineCount,
      level,
      version: 1,
      createdAt: now,
    };

    // Insert after the current section
    currentSections.splice(afterIndex + 1, 0, newSection);

    // Recompute line numbers for subsequent sections
    let currentLine = 0;
    for (const section of currentSections) {
      section.startLine = currentLine;
      section.endLine = currentLine + section.lineCount - 1;
      currentLine = section.endLine + 1;
    }

    sectionsRef.current = currentSections;

    // Reconcile immediately and activate the new section
    reconcileFromSections(currentSections);
    setActiveSectionId(newSection.id);
    setPendingCursorPosition({ line: 0, column: 0 });
  }, [reconcileFromSections]);

  /**
   * Delete a section and merge its content with the preceding section.
   * Used on Backspace at the start of an empty section.
   */
  const deleteSection = useCallback((sectionId: string) => {
    const currentSections = [...sectionsRef.current];
    const deleteIndex = currentSections.findIndex(s => s.id === sectionId);
    if (deleteIndex === -1 || deleteIndex === 0) return; // Can't delete first section

    const deletedSection = currentSections[deleteIndex];
    const prevSection = currentSections[deleteIndex - 1];

    // If the deleted section had content, append it to the previous section
    if (deletedSection.rawContent.trim()) {
      prevSection.rawContent += '\n' + deletedSection.rawContent;
      prevSection.lineCount = prevSection.rawContent.split('\n').length;
      prevSection.endLine = prevSection.startLine + prevSection.lineCount - 1;
    }

    // Remove the section
    currentSections.splice(deleteIndex, 1);

    // Recompute line numbers
    let currentLine = 0;
    for (const section of currentSections) {
      section.startLine = currentLine;
      section.endLine = currentLine + section.lineCount - 1;
      currentLine = section.endLine + 1;
    }

    sectionsRef.current = currentSections;

    // Reconcile and activate the previous section at its last line
    reconcileFromSections(currentSections);
    setActiveSectionId(prevSection.id);
    setPendingCursorPosition({ line: prevSection.lineCount - 1, column: 999 });
  }, [reconcileFromSections]);

  /**
   * Split a section at the cursor position.
   * Updates the current section with beforeContent, creates a new section with afterContent.
   */
  const splitSection = useCallback((sectionId: string, beforeContent: string, afterContent: string) => {
    const currentSections = [...sectionsRef.current];
    const sectionIndex = currentSections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const section = currentSections[sectionIndex];

    // Update the existing section with beforeContent
    section.rawContent = beforeContent;
    section.lineCount = beforeContent.split('\n').length;
    if (section.type === 'heading') {
      const match = beforeContent.trim().match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        section.displayContent = match[2];
        section.level = match[1].length;
      }
    }

    // Create a new paragraph section with afterContent
    const now = Date.now();
    const newId = uuidv4();
    const sectionContent = afterContent || '';
    const contentLineCount = sectionContent.split('\n').length;

    const newSection: Section = {
      id: newId,
      type: 'paragraph',
      rawContent: sectionContent,
      displayContent: sectionContent,
      startLine: 0, // will be recomputed
      endLine: 0,
      lineCount: contentLineCount,
      version: 1,
      createdAt: now,
    };

    currentSections.splice(sectionIndex + 1, 0, newSection);

    // Recompute line numbers
    let currentLine = 0;
    for (const s of currentSections) {
      s.startLine = currentLine;
      s.endLine = currentLine + s.lineCount - 1;
      currentLine = s.endLine + 1;
    }

    sectionsRef.current = currentSections;
    reconcileFromSections(currentSections);
    setActiveSectionId(newSection.id);
    setPendingCursorPosition({ line: 0, column: 0 });
  }, [reconcileFromSections]);

  /**
   * Convert a paragraph into a WOD block.
   * If contentBefore is non-empty, the paragraph keeps that content
   * and the WOD block is inserted after. Otherwise the paragraph
   * is replaced by the WOD block.
   */
  const convertToWod = useCallback((sectionId: string, contentBefore: string, wodBodyContent: string) => {
    const currentSections = [...sectionsRef.current];
    const sectionIndex = currentSections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    // Build the WOD section raw content with fences
    const now = Date.now();
    const newId = `wod-${Date.now().toString(16)}`;
    const wodRawContent = `\`\`\`wod\n${wodBodyContent || ''}\n\`\`\``;
    const wodLineCount = wodRawContent.split('\n').length;

    const newWodSection: Section = {
      id: newId,
      type: 'wod',
      rawContent: wodRawContent,
      displayContent: wodBodyContent || '',
      startLine: 0,
      endLine: 0,
      lineCount: wodLineCount,
      version: 1,
      createdAt: now,
    };

    if (contentBefore.trim()) {
      // Keep the paragraph with contentBefore, insert WOD after
      const section = currentSections[sectionIndex];
      section.rawContent = contentBefore;
      section.displayContent = contentBefore;
      section.lineCount = contentBefore.split('\n').length;

      currentSections.splice(sectionIndex + 1, 0, newWodSection);
    } else {
      // Replace the paragraph entirely with the WOD section
      currentSections.splice(sectionIndex, 1, newWodSection);
    }

    // Recompute line numbers
    let currentLine = 0;
    for (const s of currentSections) {
      s.startLine = currentLine;
      s.endLine = currentLine + s.lineCount - 1;
      currentLine = s.endLine + 1;
    }

    sectionsRef.current = currentSections;
    reconcileFromSections(currentSections);
    setActiveSectionId(newWodSection.id);
    setPendingCursorPosition({ line: 0, column: 0 });
  }, [reconcileFromSections]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (reconcileTimerRef.current) {
        clearTimeout(reconcileTimerRef.current);
      }
    };
  }, []);

  return {
    sections,
    totalLines,
    activeSectionId,
    activateSection,
    deactivateSection,
    pendingCursorPosition,
    updateSectionContent,
    insertSectionAfter,
    deleteSection,
    splitSection,
    convertToWod,
    rawContent,
    wodBlocks,
  };
}
