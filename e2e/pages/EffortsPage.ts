import { expect, type Locator, type Page } from '@playwright/test';
import { TEST_IDS } from '../contracts/TestIdContract';

const DB_NAME = 'wodwiki-db';

export class EffortsPage {
  constructor(readonly page: Page) {}

  async gotoCatalog() {
    await this.page.goto('/efforts', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await this.waitForCatalogLoaded();
  }

  async gotoDetail(slug: string) {
    await this.page.goto(`/effort/${encodeURIComponent(slug)}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await this.waitForDetailLoaded();
  }

  catalogRoot(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORTS_CATALOG_ROOT);
  }

  catalogSearch(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORTS_CATALOG_SEARCH);
  }

  createCustomButton(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORTS_CATALOG_CREATE_BTN);
  }

  emptyState(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORTS_CATALOG_EMPTY_STATE);
  }

  effortRow(slug: string): Locator {
    return this.page.locator(`[data-testid="effort-row-${slug}"]`).first();
  }

  effortRows(): Locator {
    return this.page.locator('[data-testid^="effort-row-"]');
  }

  detailRoot(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_DETAIL_ROOT);
  }

  detailNotFound(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_NOT_FOUND);
  }

  detailLabel(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_DETAIL_LABEL);
  }

  detailAliases(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_DETAIL_ALIASES);
  }

  detailAttributes(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_DETAIL_ATTRIBUTES);
  }

  detailSource(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_DETAIL_SOURCE);
  }

  cloneButton(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_DETAIL_CLONE_BTN);
  }

  editButton(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_DETAIL_EDIT_BTN);
  }

  saveButton(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_DETAIL_SAVE_BTN);
  }

  cancelButton(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_DETAIL_CANCEL_BTN);
  }

  deleteButton(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_DETAIL_DELETE_BTN);
  }

  notebookEditor(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_DETAIL_NOTEBOOK_EDITOR);
  }

  editorContent(): Locator {
    return this.notebookEditor().locator('.cm-content').first();
  }

  analyticsPlaceholder(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORT_DETAIL_ANALYTICS_PLACEHOLDER);
  }

  navOriginFilter(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORTS_NAV_ORIGIN_FILTER);
  }

  navDisciplineFilter(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORTS_NAV_DISCIPLINE_FILTER);
  }

  recentWorkouts(): Locator {
    return this.page.getByTestId(TEST_IDS.EFFORTS_NAV_RECENT_WORKOUTS);
  }

  recentWorkoutItems(): Locator {
    return this.page.locator(`[data-testid="${TEST_IDS.EFFORTS_NAV_RECENT_WORKOUT_ITEM}"]:visible`);
  }

  async waitForCatalogLoaded() {
    await expect(this.catalogRoot()).toBeVisible({ timeout: 15_000 });
  }

  async waitForDetailLoaded() {
    await expect(this.detailRoot().or(this.detailNotFound())).toBeVisible({ timeout: 15_000 });
  }

  async clickEffortRow(slug: string) {
    await this.effortRow(slug).click();
    await this.page.waitForURL(/\/effort\//, { timeout: 10_000 });
  }

  async clickBackToCatalog() {
    await this.page.getByRole('button', { name: 'All efforts' }).click();
    await this.page.waitForURL('**/efforts', { timeout: 10_000 });
  }

  async searchFor(value: string) {
    await this.catalogSearch().fill(value);
  }

  async openNavigationIfPresent() {
    if (await this.navOriginFilter().count()) {
      const firstOriginButton = this.navOriginFilter().getByRole('button').first();
      if (await firstOriginButton.isVisible().catch(() => false)) {
        return;
      }
    }

    const namedButton = this.page.getByRole('button', { name: /open navigation/i }).first();
    if (await namedButton.count()) {
      await namedButton.click({ force: true });
      await this.page.waitForTimeout(200);
      return;
    }

    const bannerButton = this.page.locator('[role="banner"]').getByRole('button').first();
    if (await bannerButton.count()) {
      await bannerButton.click({ force: true });
      await this.page.waitForTimeout(200);
    }
  }

  async selectOrigin(label: 'All' | 'Bundled' | 'Custom') {
    await this.openNavigationIfPresent();
    const button = this.navOriginFilter().getByRole('button', { name: label, exact: true });
    await button.evaluate((element: HTMLElement) => element.click());
  }

  async selectDiscipline(label: string) {
    await this.openNavigationIfPresent();
    const button = this.navDisciplineFilter().getByRole('button', { name: label, exact: true });
    await button.evaluate((element: HTMLElement) => element.click());
  }

  async replaceEditorDocument(text: string) {
    const editor = this.editorContent();
    await expect(editor).toBeVisible({ timeout: 10_000 });
    await editor.click();
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.insertText(text);
    await this.page.waitForTimeout(100);
  }

  async clearUserEfforts() {
    await this.page.evaluate(async (dbName) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName as string);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['efforts'], 'readwrite');
          const store = tx.objectStore('efforts');
          const getAllReq = store.getAll();

          getAllReq.onsuccess = () => {
            for (const effort of getAllReq.result ?? []) {
              if (effort.registrySource === 'user') {
                store.delete(effort.slug);
              }
            }
          };

          getAllReq.onerror = () => {
            db.close();
            reject(getAllReq.error);
          };

          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        req.onerror = () => reject(req.error);
      });
    }, DB_NAME);
  }

  async clearRecentResults() {
    await this.page.evaluate(async (dbName) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName as string);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['results'], 'readwrite');
          tx.objectStore('results').clear();
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        req.onerror = () => reject(req.error);
      });
    }, DB_NAME);
  }

  async seedUserEffort({ slug, label, discipline = 'strength', intensityTier = 'moderate', body }: {
    slug: string;
    label: string;
    discipline?: string;
    intensityTier?: string;
    body?: string;
  }) {
    await this.page.evaluate(async ({ dbName, slug, label, discipline, intensityTier, body }) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName as string);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['efforts'], 'readwrite');
          tx.objectStore('efforts').put({
            id: `effort-user-${slug}`,
            slug,
            label,
            aliases: [],
            baseAttributes: {
              met: 7.5,
              discipline,
              intensityTier,
            },
            registrySource: 'user',
            body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        req.onerror = () => reject(req.error);
      });
    }, { dbName: DB_NAME, slug, label, discipline, intensityTier, body });
  }

  async seedRecentWorkoutForEffort({ slug, label, noteId }: { slug: string; label: string; noteId: string }) {
    await this.page.evaluate(async ({ dbName, slug, label, noteId }) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName as string);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['results'], 'readwrite');
          tx.objectStore('results').put({
            id: `result-${slug}-${Date.now()}`,
            noteId,
            data: {
              logs: [
                {
                  metrics: [
                    {
                      type: 'effort-data',
                      value: { slug, label },
                    },
                  ],
                },
              ],
            },
            createdAt: Date.now(),
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        req.onerror = () => reject(req.error);
      });
    }, { dbName: DB_NAME, slug, label, noteId });
  }
}
