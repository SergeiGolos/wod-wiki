/**
 * Page Shells Module Tests
 *
 * Verifies that all page shell components and primitives are properly
 * exported and loadable.
 */

import { describe, it, expect } from 'bun:test';
import { ParallaxSection } from '@/panels/page-shells/ParallaxSection';
import { StickyNavPanel } from '@/panels/page-shells/StickyNavPanel';
import { HeroBanner } from '@/panels/page-shells/HeroBanner';
import { ScrollSection } from '@/panels/page-shells/ScrollSection';
import { ScopedRuntimeProvider } from '@/panels/page-shells/ScopedRuntimeProvider';
import { DocsPageShell } from '@/panels/page-shells/DocsPageShell';
import { JournalPageShell } from '@/panels/page-shells/JournalPageShell';
import { CalendarPageShell } from '@/panels/page-shells/CalendarPageShell';

describe('page-shells: layout primitives', () => {
  it('should export ParallaxSection', () => {
    expect(ParallaxSection).toBeDefined();
    expect(typeof ParallaxSection).toBe('function');
  });

  it('should export StickyNavPanel', () => {
    expect(StickyNavPanel).toBeDefined();
    expect(typeof StickyNavPanel).toBe('function');
  });

  it('should export HeroBanner', () => {
    expect(HeroBanner).toBeDefined();
    expect(typeof HeroBanner).toBe('function');
  });

  it('should export ScrollSection', () => {
    expect(ScrollSection).toBeDefined();
    expect(typeof ScrollSection).toBe('function');
  });

  it('should export ScopedRuntimeProvider', () => {
    expect(ScopedRuntimeProvider).toBeDefined();
    expect(typeof ScopedRuntimeProvider).toBe('function');
  });
});

describe('page-shells: page shell components', () => {
  it('should export DocsPageShell', () => {
    expect(DocsPageShell).toBeDefined();
    expect(typeof DocsPageShell).toBe('function');
  });

  it('should export JournalPageShell', () => {
    expect(JournalPageShell).toBeDefined();
    expect(typeof JournalPageShell).toBe('function');
  });

  it('should export CalendarPageShell', () => {
    expect(CalendarPageShell).toBeDefined();
    expect(typeof CalendarPageShell).toBe('function');
  });
});
