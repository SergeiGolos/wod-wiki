/**
 * Catalog / Templates / CanvasPage
 *
 * CanvasPage is the unified layout shell used by every content route in the
 * wod.wiki playground (`/`, `/journal`, `/collections`, `/syntax`,
 * `/getting-started`, etc.).  It supports two rendering modes:
 *
 *  1. **Title-bar mode** (prop `title`) — sticky header + optional sub-header
 *     + TOC sidebar at 3 xl+. Used by Journal, Collections, Home, etc.
 *
 *  2. **Sections mode** (prop `sections` without `title`) — StickyNavPanel with
 *     anchor links + scrollable section blocks. Used by Syntax and
 *     Getting-Started docs pages.
 *
 * Stories illustrated:
 *  1. TitleBarEmpty      — title-bar mode, no children
 *  2. TitleBarWithContent — title-bar mode, rich scrollable content
 *  3. TitleBarWithSubheader — sticky subheader below the title bar
 *  4. TitleBarWithIndex  — right-hand TOC sidebar (visible at 3 xl+)
 *  5. SectionsMode       — StickyNavPanel + multi-section layout
 *  6. MobileViewport     — 375 × 812 portrait phone
 */

import type { Meta, StoryObj } from '@storybook/react';
import { CanvasPage } from '@/panels/page-shells/CanvasPage';
import type { PageNavLink } from '@/components/playground/PageNavDropdown';
import type { DocsSection } from '@/panels/page-shells/types';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function PlaceholderContent({ label = 'Content area' }: { label?: string }) {
  return (
    <div className="px-6 lg:px-10 py-8 space-y-6">
      <p className="text-muted-foreground text-sm">{label}</p>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          <div className="h-2 w-full rounded bg-muted animate-pulse opacity-60" />
          <div className="h-2 w-3/4 rounded bg-muted animate-pulse opacity-40" />
        </div>
      ))}
    </div>
  );
}

const tocLinks: PageNavLink[] = [
  { id: 'intro',    label: 'Introduction' },
  { id: 'basics',   label: 'Basic Structure' },
  { id: 'timers',   label: 'Timers & Intervals' },
  { id: 'weights',  label: 'Weights' },
  { id: 'advanced', label: 'Advanced' },
];

const docsSections: DocsSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    content: (
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-foreground">Overview</h2>
        <p className="text-muted-foreground">
          WOD Wiki lets you write structured workout definitions using a simple DSL.
        </p>
        <div className="h-24 rounded-lg bg-muted/30 border border-border flex items-center justify-center text-sm text-muted-foreground">
          Section content placeholder
        </div>
      </div>
    ),
  },
  {
    id: 'syntax',
    label: 'Syntax',
    content: (
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-foreground">Syntax</h2>
        <p className="text-muted-foreground">
          Each workout block starts with a timer or round count, followed by exercises.
        </p>
        <div className="rounded-lg bg-muted/50 px-4 py-3 font-mono text-sm text-foreground">
          <div>20:00 AMRAP</div>
          <div className="pl-4">5 Pull-ups</div>
          <div className="pl-4">10 Push-ups</div>
          <div className="pl-4">15 Air Squats</div>
        </div>
      </div>
    ),
  },
  {
    id: 'examples',
    label: 'Examples',
    content: (
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-foreground">Examples</h2>
        <p className="text-muted-foreground">
          Common workout patterns — AMRAP, EMOM, For Time, Rounds.
        </p>
        <div className="h-32 rounded-lg bg-muted/30 border border-border flex items-center justify-center text-sm text-muted-foreground">
          Examples placeholder
        </div>
      </div>
    ),
  },
];

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof CanvasPage> = {
  title: 'catalog/templates/CanvasPage',
  component: CanvasPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'CanvasPage — unified layout shell used by every content route in the ' +
          'wod.wiki playground. Supports title-bar mode (sticky header + TOC) ' +
          'and sections mode (StickyNavPanel + scrollable sections).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Title-bar mode — no content (blank slate). */
export const TitleBarEmpty: Story = {
  name: 'Title-bar — Empty',
  args: {
    title: 'Journal',
  },
  render: (args) => (
    <div className="min-h-screen bg-background">
      <CanvasPage {...args} />
    </div>
  ),
};

/** Title-bar mode — with scrollable card content below. */
export const TitleBarWithContent: Story = {
  name: 'Title-bar — With Content',
  args: {
    title: 'Collections',
  },
  render: (args) => (
    <div className="min-h-screen bg-background">
      <CanvasPage {...args}>
        <PlaceholderContent label="Collections content — list of saved workouts." />
      </CanvasPage>
    </div>
  ),
};

/** Title-bar mode — with a sticky subheader strip (e.g. search / filter bar). */
export const TitleBarWithSubheader: Story = {
  name: 'Title-bar — With Subheader',
  args: {
    title: 'Journal',
  },
  render: (args) => (
    <div className="min-h-screen bg-background">
      <CanvasPage
        {...args}
        subheader={
          <div className="px-6 lg:px-10 py-2">
            <div className="flex gap-2 overflow-x-auto">
              {['All', 'This Week', 'This Month', 'PRs'].map((tab) => (
                <button
                  key={tab}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                    tab === 'All'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        }
        actions={
          <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg">
            + New Entry
          </button>
        }
      >
        <PlaceholderContent label="Journal entries — filtered by selected tab." />
      </CanvasPage>
    </div>
  ),
};

/** Title-bar mode — with right-hand TOC sidebar (visible at 3 xl+ screen widths). */
export const TitleBarWithIndex: Story = {
  name: 'Title-bar — With TOC Sidebar',
  args: {
    title: 'Getting Started',
  },
  render: (args) => (
    <div className="min-h-screen bg-background">
      <CanvasPage {...args} index={tocLinks}>
        <div className="px-6 lg:px-10 py-8 space-y-16">
          {tocLinks.map((link) => (
            <section key={link.id} id={link.id} className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">{link.label}</h2>
              <p className="text-muted-foreground text-sm">
                Content for the {link.label} section. Scroll to see the TOC highlight
                update at 3 xl+ screen widths.
              </p>
              <div className="h-24 rounded-xl border border-border bg-muted/20" />
            </section>
          ))}
        </div>
      </CanvasPage>
    </div>
  ),
};

/**
 * Sections mode — StickyNavPanel with multiple anchor-scrollable sections.
 * Used by `/syntax` and `/getting-started` documentation pages.
 */
export const SectionsMode: Story = {
  name: 'Sections mode — Docs page',
  render: () => (
    <div className="min-h-screen bg-background">
      <CanvasPage sections={docsSections} />
    </div>
  ),
};

/** Mobile viewport (375 × 812) — title-bar mode with content. */
export const MobileViewport: Story = {
  name: 'Mobile (375 × 812)',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => (
    <div className="min-h-screen bg-background">
      <CanvasPage title="Journal" actions={<button className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">+ New</button>}>
        <PlaceholderContent label="Journal — mobile layout. Title bar is hidden on mobile (SidebarLayout navbar replaces it)." />
      </CanvasPage>
    </div>
  ),
};
