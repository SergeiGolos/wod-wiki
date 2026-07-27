import { Page, Locator, expect } from '@playwright/test';

/**
 * EffortDetailPage — Page Object for /effort/:slug (Storybook acceptance)
 *
 * Mirrors the JournalPageShell layout used by EffortDetailPage:
 * - Sticky header with title + actions
 * - NoteEditor for the YAML/markdown effort document
 * - "Show Resolved" toggle for the inline effective-resolution widget
 * - No index sidebar for bare frontmatter-only efforts (no headings)
 */
export class EffortDetailPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ── Storybook navigation ─────────────────────────────────────────────────

  storyUrl(storyId: string): string {
    return `/iframe.html?id=${storyId}&viewMode=story`;
  }

  async gotoStory(storyId: string) {
    await this.page.goto(this.storyUrl(storyId), { waitUntil: 'networkidle' });
    // Give EffortRegistryProvider time to init bundled efforts
    await this.page.waitForTimeout(800);
  }

  // ── JournalPageShell — Sticky Header ─────────────────────────────────────

  /** The sticky header container (hidden on mobile, visible lg+) */
  header(): Locator {
    return this.page.locator('.lg\\:sticky.lg\\:top-0').first();
  }

  /** The H1 title inside the JournalPageShell sticky header */
  titleHeading(): Locator {
    // Scope to the shell header to avoid Storybook's own "No Preview" h1
    return this.page.locator('.lg\\:sticky.lg\\:top-0 h1').first();
  }

  /** Actions bar inside the sticky header (back, clone, origin badge, resolved toggle) */
  actionsBar(): Locator {
    // The actions are rendered inside the header's right-side flex container
    return this.page.locator('.lg\\:sticky.lg\\:top-0 .flex.items-center.gap-2.md\\:gap-4.shrink-0').first();
  }

  backButton(): Locator {
    return this.page.getByRole('button', { name: /Back to catalog/i });
  }

  cloneButton(): Locator {
    return this.page.getByRole('button', { name: /Clone/i });
  }

  editButton(): Locator {
    return this.page.getByRole('button', { name: /Edit/i });
  }

  originBadge(): Locator {
    return this.header().locator('div', { hasText: /Bundled|Custom/ }).first();
  }

  // ── Effective Resolution widget ────────────────────────────────────────────

  showResolvedButton(): Locator {
    return this.page.getByRole('button', { name: /Show Resolved/i });
  }

  hideResolvedButton(): Locator {
    return this.page.getByRole('button', { name: /Hide Resolved/i });
  }

  async clickShowResolved() {
    await this.showResolvedButton().click();
    await this.page.waitForTimeout(200);
  }

  async clickHideResolved() {
    await this.hideResolvedButton().click();
    await this.page.waitForTimeout(200);
  }

  /** The inline resolved widget (visible after clicking Show Resolved) */
  resolvedWidget(): Locator {
    return this.page.getByRole('heading', { name: 'Effective Resolution' }).first().locator('xpath=..');
  }

  // ── JournalPageShell — Index Sidebar ─────────────────────────────────────

  /** The aside sidebar rendered on 3xl viewports (only when document has headings) */
  indexSidebar(): Locator {
    return this.page.locator('aside').first();
  }

  indexLink(label: string): Locator {
    return this.indexSidebar().getByRole('button', { name: label });
  }

  // ── NoteEditor (read/edit mode) ────────────────────────────────────────────

  noteEditor(): Locator {
    return this.page.locator('.cm-note-editor');
  }

  editorContent(): Locator {
    return this.page.locator('.cm-content');
  }

  async waitForNoteEditor() {
    await this.page.waitForSelector('.cm-note-editor', { timeout: 10_000 });
    await this.page.waitForTimeout(300);
  }

  async clickClone() {
    await this.cloneButton().click();
    await this.page.waitForTimeout(400);
  }

  // ── Toast ────────────────────────────────────────────────────────────────

  async expectToast(text: string) {
    const toast = this.page.locator('[data-sonner-toast]', { hasText: text }).first();
    await expect(toast).toBeVisible({ timeout: 5_000 });
  }

  // ── Scroll helpers ───────────────────────────────────────────────────────

  async scrollToSection(id: string) {
    await this.page.evaluate((sectionId) => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, id);
    await this.page.waitForTimeout(300);
  }
}
