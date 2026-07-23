import { test, expect, type Page } from '@playwright/test';
import { WOD_DB } from '../helpers/wodwikiDb';

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

/**
 * Extract the heading line and fenced wod block from test content, mirroring
 * the app's section model so seeded segments load identically.
 */
function parseWodContent(content: string): {
  heading: string;
  wodContent: string;
  dialect: string;
} {
  const lines = content.split('\n');
  const heading = lines.find((l) => l.startsWith('#')) ?? '';
  const openIdx = lines.findIndex((l) => /^```(\w+)/.test(l.trim()));
  if (openIdx === -1) throw new Error(`No code fence in content: ${content}`);
  const dialect = lines[openIdx].trim().match(/^```(\w+)/)?.[1] ?? 'wod';
  const closeIdx = lines.findIndex((l, i) => i > openIdx && l.trim() === '```');
  const endIdx = closeIdx === -1 ? lines.length : closeIdx;
  const wodContent = lines.slice(openIdx + 1, endIdx).join('\n');
  return { heading, wodContent, dialect };
}

/** FNV-1a content hash — identical to sectionParser.blockContentId. */
function blockContentIdOf(content: string): string {
  const normalized = content.trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `bc-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Seed a Note + NoteSegments + WorkoutResult into wodwiki-db (V11 schema).
 * The result's `blockContentId` matches the FNV-1a hash the editor's
 * section-state plugin computes at runtime, so the results inlay widget
 * finds it without any V4-era `sectionId` / `completedAt` fields.
 */
async function seedWodDbNoteAndResult(page: Page, route: SeedRoute) {
  const { heading, wodContent, dialect } = parseWodContent(route.content);
  const contentId = blockContentIdOf(wodContent);
  const wodSegmentId = `wod-seg-${route.noteId.replace(/[^a-z0-9]+/gi, '-')}`;
  const isPlayground = route.noteId.startsWith('playground/');

  await page.evaluate(
    async ({ dbName, route, heading, wodContent, dialect, wodSegmentId, contentId, isPlayground }) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['notes', 'segments', 'results'], 'readwrite');
          const now = Date.now();

          // V11 slim Note — identity + routing only; content lives in segments.
          tx.objectStore('notes').put({
            id: route.noteId,
            title: route.title,
            type: isPlayground ? 'playground' : 'note',
            createdAt: now,
          });

          // Heading segment (h1).
          tx.objectStore('segments').put({
            id: 'seg-heading',
            version: 1,
            noteId: route.noteId,
            position: 0,
            dataType: 'h1',
            data: null,
            rawContent: heading,
            createdAt: now,
            updatedAt: now,
            isHistory: false,
          });

          // Wod segment — the app reconstructs this as a fenced code block.
          tx.objectStore('segments').put({
            id: wodSegmentId,
            version: 1,
            noteId: route.noteId,
            position: 1,
            dataType: 'wod',
            data: { dialect },
            rawContent: wodContent,
            createdAt: now,
            updatedAt: now,
            isHistory: false,
          });

          // Result — matched via blockContentId (content-stable FNV-1a hash).
          const resultId = `WOD-341-${route.noteId.replace(/[^a-z0-9]+/gi, '-')}`;
          tx.objectStore('results').put({
            id: resultId,
            noteId: route.noteId,
            segmentId: wodSegmentId,
            blockContentId: contentId,
            createdAt: now,
            origin: isPlayground ? 'playground' : 'journal',
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
    },
    { dbName: WOD_DB, route, heading, wodContent, dialect, wodSegmentId, contentId, isPlayground },
  );
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
