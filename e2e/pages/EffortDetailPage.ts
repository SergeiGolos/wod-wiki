import { Page, Locator, expect } from '@playwright/test';

/**
 * EffortDetailPage — Page Object for /effort/:slug (Storybook acceptance)
 *
 * Mirrors the JournalPageShell layout used by EffortDetailPage:
 * - Sticky header with title + actions
 * - Index sidebar (3xl)
 * - Content cards with section IDs for TOC scroll targets
 * - NoteEditor in edit/clone mode
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

  /** Actions bar inside the sticky header (back, clone, edit, origin badge) */
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
    return this.page.locator('div', { hasText: /Bundled|Custom|Estimated/ }).first();
  }

  // ── JournalPageShell — Index Sidebar ─────────────────────────────────────

  /** The aside sidebar rendered on 3xl viewports */
  indexSidebar(): Locator {
    return this.page.locator('aside').first();
  }

  indexLink(label: string): Locator {
    return this.indexSidebar().getByRole('button', { name: label });
  }

  // ── Content Cards ────────────────────────────────────────────────────────

  attributesCard(): Locator {
    return this.page.locator('#attributes');
  }

  aliasesCard(): Locator {
    return this.page.locator('#aliases');
  }

  notesCard(): Locator {
    return this.page.locator('#notes');
  }

  derivationCard(): Locator {
    return this.page.locator('#derivation');
  }

  analyticsCard(): Locator {
    return this.page.locator('#analytics');
  }

  effectiveResolutionCard(): Locator {
    return this.page.locator('#effective-resolution');
  }

  appliedModifiersCard(): Locator {
    return this.page.locator('#applied-modifiers');
  }

  parentChainCard(): Locator {
    return this.page.locator('#parent-chain');
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────

  resolvedTab(): Locator {
    return this.page.getByRole('button', { name: /Resolved/i });
  }

  definitionTab(): Locator {
    return this.page.getByRole('button', { name: /Definition/i });
  }

  async clickResolvedTab() {
    await this.resolvedTab().click();
    await this.page.waitForTimeout(200);
  }

  async clickDefinitionTab() {
    await this.definitionTab().click();
    await this.page.waitForTimeout(200);
  }

  // ── NoteEditor (edit/clone mode) ─────────────────────────────────────────

  noteEditor(): Locator {
    return this.page.locator('.cm-note-editor');
  }

  editorContent(): Locator {
    return this.page.locator('.cm-content[contenteditable="true"]');
  }

  async waitForNoteEditor() {
    await this.page.waitForSelector('.cm-note-editor', { timeout: 10_000 });
    await this.page.waitForTimeout(300);
  }

  async clickClone() {
    await this.cloneButton().click();
    await this.page.waitForTimeout(400);
  }

  saveButton(): Locator {
    return this.page.getByRole('button', { name: /Save/i }).first();
  }

  cancelButton(): Locator {
    return this.page.getByRole('button', { name: /Cancel/i }).first();
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
