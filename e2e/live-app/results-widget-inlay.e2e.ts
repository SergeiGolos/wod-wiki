import { test, expect, type Page } from '@playwright/test';

const WOD_DB = 'wodwiki-db';
const WOD_DB_VERSION = 4;
const PLAYGROUND_DB = 'wodwiki-playground';
const PLAYGROUND_DB_VERSION = 2;

const ROUTES = {
  journal: {
    path: '/journal/2099-09-01',
    noteId: 'journal/2099-09-01',
    title: 'Journal Result Widget Regression',
    screenshot: 'e2e/screenshots/results-widget-journal-after-reload.png',
    content: `# Journal Result Widget Regression

\`\`\`wod
Timer: 1:00
5 Burpees
\`\`\`
`,
  },
  playground: {
    path: '/playground/WOD-341-results-widget',
    noteId: 'playground/WOD-341-results-widget',
    title: 'Playground Result Widget Regression',
    screenshot: 'e2e/screenshots/results-widget-playground-after-reload.png',
    content: `# Playground Result Widget Regression

\`\`\`wod
Timer: 1:00
7 Air Squats
\`\`\`
`,
  },
  canvas: {
    path: '/',
    noteId: 'canvas:home',
    title: 'Canvas Home Result Widget Regression',
    screenshot: 'e2e/screenshots/results-widget-canvas-after-reload.png',
    content: `# Morning Strength
\`\`\`wod
(3)
  10 Kettlebell Swings 24kg
  *:30 Rest
\`\`\`
`,
  },
} as const;

type SeedRoute = typeof ROUTES[keyof typeof ROUTES];

function stableWodSectionId(content: string): string {
  const lines = content.split('\n');
  const openIndex = lines.findIndex((line) => line.trim().toLowerCase().startsWith('```wod'));
  if (openIndex === -1) throw new Error(`No wod fence found in test content: ${content}`);

  let closeIndex = lines.findIndex((line, index) => index > openIndex && line.trim() === '```');
  if (closeIndex === -1) closeIndex = lines.length - 1;

  const sectionContent = lines.slice(openIndex, closeIndex + 1).join('\n');
  let hash = 0;
  for (let i = 0; i < Math.min(sectionContent.length, 128); i += 1) {
    hash = ((hash << 5) - hash + sectionContent.charCodeAt(i)) | 0;
  }
  return `wod-${openIndex + 1}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

async function seedPlaygroundPage(page: Page, noteId: string, content: string) {
  await page.evaluate(async ({ dbName, version, noteId, content }) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(dbName, version);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('pages')) {
          const store = db.createObjectStore('pages', { keyPath: 'id' });
          store.createIndex('by-updated', 'updatedAt');
          store.createIndex('by-category', 'category');
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('pages', 'readwrite');
        const [category, ...nameParts] = noteId.split('/');
        tx.objectStore('pages').put({
          id: noteId,
          category,
          name: nameParts.join('/'),
          content,
          updatedAt: Date.now(),
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
  }, { dbName: PLAYGROUND_DB, version: PLAYGROUND_DB_VERSION, noteId, content });
}

async function seedWodDbNoteAndResult(page: Page, route: SeedRoute) {
  const sectionId = stableWodSectionId(route.content);
  await page.evaluate(async ({ dbName, version, route, sectionId }) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(dbName, version);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('notes')) {
          const store = db.createObjectStore('notes', { keyPath: 'id' });
          store.createIndex('by-updated', 'updatedAt');
          store.createIndex('by-target-date', 'targetDate');
        }
        if (!db.objectStoreNames.contains('segments')) {
          const store = db.createObjectStore('segments', { keyPath: ['id', 'version'] });
          store.createIndex('by-note', 'noteId');
          store.createIndex('by-type', 'dataType');
        }
        if (!db.objectStoreNames.contains('results')) {
          const store = db.createObjectStore('results', { keyPath: 'id' });
          store.createIndex('by-segment', 'segmentId');
          store.createIndex('by-note', 'noteId');
          store.createIndex('by-completed', 'completedAt');
        }
        if (!db.objectStoreNames.contains('attachments')) {
          const store = db.createObjectStore('attachments', { keyPath: 'id' });
          store.createIndex('by-note', 'noteId');
          store.createIndex('by-time', 'createdAt');
        }
        if (!db.objectStoreNames.contains('analytics')) {
          const store = db.createObjectStore('analytics', { keyPath: 'id' });
          store.createIndex('by-type', 'metricType');
          store.createIndex('by-segment', 'segmentId');
          store.createIndex('by-result', 'resultId');
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['notes', 'results'], 'readwrite');
        const now = Date.now();
        tx.objectStore('notes').put({
          id: route.noteId,
          title: route.title,
          rawContent: route.content,
          tags: ['e2e', 'WOD-341'],
          createdAt: now,
          updatedAt: now,
          targetDate: now,
          segmentIds: [],
          type: route.noteId.startsWith('playground/') ? 'playground' : 'note',
        });

        const resultId = `WOD-341-${route.noteId.replace(/[^a-z0-9]+/gi, '-')}`;
        tx.objectStore('results').put({
          id: resultId,
          noteId: route.noteId,
          sectionId,
          segmentId: sectionId,
          completedAt: now,
          data: {
            startTime: now - 74_000,
            endTime: now,
            duration: 74_000,
            completed: true,
            logs: [],
            metrics: [],
          },
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
  }, { dbName: WOD_DB, version: WOD_DB_VERSION, route, sectionId });
}

function monitorCriticalConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    if (
      message.type() === 'error' ||
      /NOTE_NOT_FOUND|persistence|IndexedDB|CodeMirror|plugin|exception/i.test(text)
    ) {
      errors.push(`[${message.type()}] ${text}`);
    }
  });
  return errors;
}

async function expectResultWidgetAfterReload(page: Page, route: SeedRoute) {
  await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 15_000 });
  const widget = page.locator('.cm-wod-results-inlay').first();
  await expect(widget, `${route.noteId} should show the result inlay before reload`).toBeVisible({ timeout: 10_000 });
  await expect(widget).toContainText(/1:14|Result/);

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 });
  await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 15_000 });
  await expect(widget, `${route.noteId} should show the result inlay after reload`).toBeVisible({ timeout: 10_000 });
  await expect(widget).toContainText(/1:14|Result/);
  await page.screenshot({ path: route.screenshot, fullPage: true });
}

test.describe('WOD results widget persistence in live app routes', () => {
  test('shows .cm-wod-results-inlay after reload for journal, playground, and canvas routes', async ({ page }) => {
    const criticalConsole = monitorCriticalConsole(page);

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 });

    await seedPlaygroundPage(page, ROUTES.journal.noteId, ROUTES.journal.content);
    await seedPlaygroundPage(page, ROUTES.playground.noteId, ROUTES.playground.content);
    await seedWodDbNoteAndResult(page, ROUTES.journal);
    await seedWodDbNoteAndResult(page, ROUTES.playground);
    await seedWodDbNoteAndResult(page, ROUTES.canvas);

    await expectResultWidgetAfterReload(page, ROUTES.journal);
    await expectResultWidgetAfterReload(page, ROUTES.playground);
    await expectResultWidgetAfterReload(page, ROUTES.canvas);

    const unexpectedErrors = criticalConsole.filter((entry) =>
      /NOTE_NOT_FOUND|persistence|IndexedDB|CodeMirror|plugin|exception/i.test(entry)
    );
    expect(unexpectedErrors, 'No result persistence or CodeMirror plugin errors should surface').toHaveLength(0);
  });
});
