import { test, expect, type Page } from '@playwright/test';
import { WOD_DB } from '../helpers/wodwikiDb';

const ROUTES = {
  journal: {
    path: '/journal/2099-09-01',
    noteId: 'journal/2099-09-01',
    title: 'Journal Result Widget Regression',
    screenshot: 'e2e/screenshots/results-widget-journal-after-reload.png',
    content: `# Journal Result Widget Regression

\`\`\`time
Timer: 1:00
5 Burpees
\`\`\`

\`\`\`query:table
:segment{result:WOD-341-journal-2099-09-01}
\`\`\`
`,
  },
  playground: {
    path: '/playground/WOD-341-results-widget',
    noteId: 'playground/WOD-341-results-widget',
    title: 'Playground Result Widget Regression',
    screenshot: 'e2e/screenshots/results-widget-playground-after-reload.png',
    content: `# Playground Result Widget Regression

\`\`\`time
Timer: 1:00
7 Air Squats
\`\`\`

\`\`\`query:table
:segment{result:WOD-341-playground-WOD-341-results-widget}
\`\`\`
`,
  },
} as const;

type SeedRoute = typeof ROUTES[keyof typeof ROUTES];

/**
 * Extract the heading line and fenced workout block from test content, mirroring
 * the app's section model so seeded segments load identically.
 */
function parseWorkoutContent(content: string): {
  heading: string;
  workoutContent: string;
  dialect: string;
} {
  const lines = content.split('\n');
  const heading = lines.find((l) => l.startsWith('#')) ?? '';
  const openIdx = lines.findIndex((l) => /^```(\w+)/.test(l.trim()));
  if (openIdx === -1) throw new Error(`No code fence in content: ${content}`);
  const dialect = lines[openIdx].trim().match(/^```(\w+)/)?.[1] ?? 'time';
  const closeIdx = lines.findIndex((l, i) => i > openIdx && l.trim() === '```');
  const endIdx = closeIdx === -1 ? lines.length : closeIdx;
  const workoutContent = lines.slice(openIdx + 1, endIdx).join('\n');
  return { heading, workoutContent, dialect };
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
async function seedWorkoutDbNotesAndResults(page: Page, routes: SeedRoute[]) {
  const seeds = routes.map((route) => {
    const { heading, workoutContent, dialect } = parseWorkoutContent(route.content);
    return {
      route,
      heading,
      workoutContent,
      dialect,
      contentId: blockContentIdOf(workoutContent),
      workoutSegmentId: `wod-seg-${route.noteId.replace(/[^a-z0-9]+/gi, '-')}`,
      isPlayground: route.noteId.startsWith('playground/'),
      journalDate: route.noteId.startsWith('journal/') ? route.noteId.split('/')[1] : undefined,
    };
  });

  // Single evaluate: the home page can navigate asynchronously between
  // seeds, destroying the execution context of a second call.
  await page.evaluate(
    async ({ dbName, seeds }) => {
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        for (const { route, heading, workoutContent, dialect, workoutSegmentId, contentId, isPlayground, journalDate } of seeds) {
          await new Promise<void>((resolve, reject) => {
            const storeNames = ['page', 'notes', 'segments', 'page_notes', 'sessions', 'events']
              .filter((s) => db.objectStoreNames.contains(s));
            const tx = db.transaction(storeNames, 'readwrite');
            const now = Date.now();

            // Journal-date notes join their calendar page (N-02) — the page row
            // AND the page_notes junction (V22: journalDate is derived through
            // it), or the /journal/:date list query finds no note and renders
            // the no-editor empty state (#698).
            if (journalDate) {
              tx.objectStore('page').put({ id: `page/${journalDate}`, date: journalDate, title: journalDate, createdAt: now });
              if (db.objectStoreNames.contains('page_notes')) {
                tx.objectStore('page_notes').put({
                  id: `pn-page/${journalDate}-${route.noteId}`,
                  pageId: `page/${journalDate}`,
                  noteId: route.noteId,
                  position: 0,
                  createdAt: now,
                });
              }
            }

            // V11 slim Note — identity + routing only; content lives in segments.
            tx.objectStore('notes').put({
              id: route.noteId,
              title: route.title,
              type: journalDate ? 'journal' : isPlayground ? 'playground' : 'note',
              pageId: journalDate ? `page/${journalDate}` : undefined,
              createdAt: now,
            });

            // Heading segment (h1). Key is ['id','version'] — scope the id per
            // note so multi-route seeds can't overwrite each other.
            tx.objectStore('segments').put({
              id: `${workoutSegmentId}-heading`,
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

            // Workout segment — the app reconstructs this as a fenced code block.
            tx.objectStore('segments').put({
              id: workoutSegmentId,
              version: 1,
              noteId: route.noteId,
              position: 1,
              dataType: 'wod',
              data: { dialect },
              rawContent: workoutContent,
              createdAt: now,
              updatedAt: now,
              isHistory: false,
            });
            const resultId = `WOD-341-${route.noteId.replace(/[^a-z0-9]+/gi, '-')}`;

            // Query segment (#944 write-on-completion session query block)
            tx.objectStore('segments').put({
              id: `${workoutSegmentId}-query`,
              version: 1,
              noteId: route.noteId,
              position: 2,
              dataType: 'query',
              data: { widgetType: 'table' },
              rawContent: `\`\`\`query:table\n:segment{result:${resultId}}\n\`\`\``,
              createdAt: now,
              updatedAt: now,
              isHistory: false,
            });

            // Result — matched via blockContentId (content-stable FNV-1a hash).
            // Canonical store since the V20 flatten: `sessions` (top-level
            // fields, no legacy nested `data` payload).
            tx.objectStore('sessions').put({
              id: resultId,
              noteId: route.noteId,
              segmentId: workoutSegmentId,
              blockContentId: contentId,
              startTime: now - 74_000,
              endTime: now,
              duration: 74_000,
              completed: true,
              status: 'completed',
              createdAt: now,
            });

            tx.objectStore('events').put({
              id: `${resultId}:0`,
              resultId,
              noteId: route.noteId,
              segmentId: workoutSegmentId,
              segmentVersion: 1,
              blockContentId: contentId,
              timestamp: now,
              grain: 'event',
              outputType: 'segment',
              effortSlug: 'kettlebell-swing',
              metrics: [{ type: 'tis', value: 74, unit: 's', metadata: { canonicalKey: 'tis' } }],
            });

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
          });
        }
      } finally {
        db.close();
      }
    },
    { dbName: WOD_DB, seeds },
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
  await expect(page.locator('.cm-content').first()).toBeAttached({ timeout: 15_000 });
  const widget = page.locator('.cm-query-block-preview, [data-testid="rows-table"]').first();
  await expect(widget, `${route.noteId} should show the query table results block before reload`).toBeVisible({ timeout: 10_000 });
  await expect(widget.locator('tbody')).toContainText('kettlebell-swing');
  await expect(widget.locator('tbody')).toContainText('74');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 });
  await expect(page.locator('.cm-content').first()).toBeAttached({ timeout: 15_000 });
  await expect(widget, `${route.noteId} should show the query table results block after reload`).toBeVisible({ timeout: 10_000 });
  await expect(widget.locator('tbody')).toContainText('kettlebell-swing');
  await expect(widget.locator('tbody')).toContainText('74');
  await page.screenshot({ path: route.screenshot, fullPage: true });
}

test.describe('Workout results widget persistence in live app routes', () => {
  test('shows .cm-query-block-preview after reload for journal and playground routes', async ({ page }) => {
    const criticalConsole = monitorCriticalConsole(page);

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    // The canvas home page redirects/renders asynchronously — wait for the
    // app shell so seeding evaluates don't die mid-navigation.
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 15_000 });

    await seedWorkoutDbNotesAndResults(page, [ROUTES.journal, ROUTES.playground]);

    await expectResultWidgetAfterReload(page, ROUTES.journal);
    await expectResultWidgetAfterReload(page, ROUTES.playground);

    const unexpectedErrors = criticalConsole.filter((entry) =>
      // The IndexedDB v11-open info line is benign boot chatter, not an error.
      !/wodwiki-db v\d+ open/.test(entry) &&
      /NOTE_NOT_FOUND|persistence|IndexedDB|CodeMirror|plugin|exception/i.test(entry)
    );
    expect(unexpectedErrors, 'No result persistence or CodeMirror plugin errors should surface').toHaveLength(0);
  });
});
