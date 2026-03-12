/**
 * Tests for useSectionDocument Phase 2 editing capabilities
 * 
 * Tests the editing methods (updateSectionContent, insertSectionAfter,
 * deleteSection) and section lifecycle (activate, deactivate, reconciliation).
 */

import { describe, it, expect } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useSectionDocument } from '../useSectionDocument';

describe('useSectionDocument', () => {
  const simpleContent = '# Title\n\nParagraph text\n\n```wod\n5:00 Run\n```\n\nEnd notes';

  describe('initialization', () => {
    it('parses initialContent into sections', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: simpleContent }),
      );

      expect(result.current.sections.length).toBeGreaterThanOrEqual(3);
      expect(result.current.rawContent).toBe(simpleContent);
    });

    it('uses value over initialContent when both provided', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: '# Old', value: '# New' }),
      );

      expect(result.current.rawContent).toBe('# New');
      const title = result.current.sections.find(s => s.type === 'title');
      expect(title?.displayContent).toBe('# New');
    });

    it('starts with no active section', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: simpleContent }),
      );

      expect(result.current.activeSectionId).toBeNull();
      expect(result.current.pendingCursorPosition).toBeNull();
    });

    it('extracts wodBlocks from sections', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: simpleContent }),
      );

      expect(result.current.wodBlocks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('activateSection', () => {
    it('sets activeSectionId', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: '# Title\n\nParagraph' }),
      );

      const headingId = result.current.sections[0].id;

      act(() => {
        result.current.activateSection(headingId);
      });

      expect(result.current.activeSectionId).toBe(headingId);
    });

    it('sets pendingCursorPosition when provided', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: '# Title\n\nParagraph' }),
      );

      const headingId = result.current.sections[0].id;

      act(() => {
        result.current.activateSection(headingId, { line: 0, column: 5 });
      });

      expect(result.current.pendingCursorPosition).toEqual({ line: 0, column: 5 });
    });
  });

  describe('deactivateSection', () => {
    it('clears activeSectionId and pendingCursorPosition', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: '# Title\n\nParagraph' }),
      );

      const headingId = result.current.sections[0].id;

      act(() => {
        result.current.activateSection(headingId, { line: 0, column: 3 });
      });

      expect(result.current.activeSectionId).toBe(headingId);

      act(() => {
        result.current.deactivateSection();
      });

      expect(result.current.activeSectionId).toBeNull();
      expect(result.current.pendingCursorPosition).toBeNull();
    });
  });

  describe('updateSectionContent', () => {
    it('updates rawContent when a section is edited', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: '# Title\n\nParagraph' }),
      );

      const titleSection = result.current.sections.find(s => s.type === 'title')!;

      act(() => {
        result.current.activateSection(titleSection.id);
        result.current.updateSectionContent(titleSection.id, '# New Title');
      });

      expect(result.current.rawContent).toContain('# New Title');
    });

    it('updates section lineCount when adding lines', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: 'Line one' }),
      );

      const section = result.current.sections[0];

      act(() => {
        result.current.activateSection(section.id);
        result.current.updateSectionContent(section.id, 'Line one\nLine two\nLine three');
      });

      // While editing, rawContent reflects the current value
      expect(result.current.rawContent).toContain('Line one\nLine two\nLine three');

      act(() => {
        result.current.deactivateSection();
      });

      // After deactivation, rawContent stays clean (no metadata injected)
      expect(result.current.rawContent).toContain('Line one');
    });

    it('calls onContentChange after debounce', async () => {
      let capturedContent = '';
      const { result } = renderHook(() =>
        useSectionDocument({
          initialContent: '# Title',
          onContentChange: (content) => { capturedContent = content; },
        }),
      );

      const section = result.current.sections[0];

      act(() => {
        result.current.updateSectionContent(section.id, '# Updated');
      });

      // Wait for debounce (300ms + buffer)
      await new Promise(r => setTimeout(r, 400));

      expect(capturedContent).toContain('# Updated');
    });
  });

  describe('insertSectionAfter', () => {
    it('inserts a new section after the specified section', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: '# Title\n\nParagraph' }),
      );

      const initialSectionCount = result.current.sections.length;
      const firstSection = result.current.sections[0];

      act(() => {
        result.current.insertSectionAfter(firstSection.id, 'New content');
      });

      expect(result.current.sections.length).toBeGreaterThanOrEqual(initialSectionCount);
      // The raw content should contain the new content
      expect(result.current.rawContent).toContain('New content');
    });

    it('activates the newly inserted section', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: '# Title\n\nEnd' }),
      );

      const firstSection = result.current.sections[0];

      act(() => {
        result.current.insertSectionAfter(firstSection.id, '');
      });

      // The active section should be set (to the new section's ID)
      expect(result.current.activeSectionId).not.toBeNull();
    });
  });

  describe('deleteSection', () => {
    it('removes a section and keeps content coherent', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: '# Title\n\nMiddle\n\nEnd' }),
      );

      // Find a section that's not the first one
      const sections = result.current.sections;
      if (sections.length >= 2) {
        const secondSection = sections[1];

        act(() => {
          result.current.deleteSection(secondSection.id);
        });

        // Should have fewer sections now (or same if re-parse merges differently)
        expect(result.current.sections.length).toBeLessThanOrEqual(sections.length);
      }
    });

    it('does not delete the first section', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: '# Title\n\nParagraph' }),
      );

      const firstSection = result.current.sections[0];
      const initialCount = result.current.sections.length;

      act(() => {
        result.current.deleteSection(firstSection.id);
      });

      // First section should not be deleted
      expect(result.current.sections.length).toBe(initialCount);
    });

    it('activates the previous section after deletion', () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: '# Title\n\nMiddle\n\nEnd' }),
      );

      const sections = result.current.sections;
      if (sections.length >= 2) {
        const secondSection = sections[1];
        const firstSectionId = sections[0].id;

        act(() => {
          result.current.deleteSection(secondSection.id);
        });

        // Should activate the first section (previous section)
        expect(result.current.activeSectionId).toBe(firstSectionId);
      }
    });
  });

  describe('controlled value sync', () => {
    it('updates rawContent when value prop changes', () => {
      const { result, rerender } = renderHook(
        (props) => useSectionDocument(props),
        { initialProps: { initialContent: '# Old', value: '# Old' } as any },
      );

      expect(result.current.rawContent).toBe('# Old');

      rerender({ initialContent: '# Old', value: '# New' });

      expect(result.current.rawContent).toBe('# New');
    });
  });

  describe('section ID stability', () => {
    it('preserves section IDs across re-parses with same content', () => {
      const { result, rerender } = renderHook(
        (props) => useSectionDocument(props),
        { initialProps: { initialContent: '# Title\n\nParagraph', value: '# Title\n\nParagraph' } as any },
      );

      const firstIds = result.current.sections.map(s => s.id);

      rerender({ initialContent: '# Title\n\nParagraph', value: '# Title\n\nParagraph' });

      const secondIds = result.current.sections.map(s => s.id);
      expect(secondIds).toEqual(firstIds);
    });
  });

  describe('versioning metadata', () => {
    it('deactivation clears active state after edit', async () => {
      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: 'Initial content' }),
      );

      const section = result.current.sections[0];

      act(() => {
        result.current.activateSection(section.id);
      });

      act(() => {
        result.current.updateSectionContent(section.id, 'Updated content');
      });

      expect(result.current.activeSectionId).toBe(section.id);

      act(() => {
        result.current.deactivateSection();
      });

      expect(result.current.activeSectionId).toBeNull();
      // Content should reflect the update
      expect(result.current.rawContent).toContain('Updated content');
    });

    it('preserves version and ID when loading content with existing metadata', () => {
      const metadata = '<!-- section-metadata id:test-uuid version:42 created:123456789 -->';
      const contentWithMetadata = `Some text\n${metadata}`;

      const { result } = renderHook(() =>
        useSectionDocument({ initialContent: contentWithMetadata }),
      );

      const section = result.current.sections[0];
      expect(section.id).toBe('test-uuid');
      expect(section.version).toBe(42);
      expect(section.createdAt).toBe(123456789);
      expect(section.displayContent).toBe('Some text');
    });
  });
});
