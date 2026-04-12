/**
 * Page Shells — Barrel Exports
 *
 * Reusable layout shells that compose panel primitives with scoped runtime contexts.
 */

// Types
export * from './types';

// Layout Primitives
export { ParallaxSection, type ParallaxSectionProps, type ParallaxStepDescriptor } from './ParallaxSection';
export { StickyNavPanel, type StickyNavPanelProps, type StickyNavSection } from './StickyNavPanel';
export { HeroBanner, type HeroBannerProps } from './HeroBanner';
export { ScrollSection, type ScrollSectionProps } from './ScrollSection';
export { ScopedRuntimeProvider, type ScopedRuntimeProviderProps } from './ScopedRuntimeProvider';

// Page Shells
export { CanvasPage, type CanvasPageProps } from './CanvasPage';
export { JournalPageShell, type JournalPageShellProps } from './JournalPageShell';
export { CalendarPageShell, type CalendarPageShellProps } from './CalendarPageShell';
