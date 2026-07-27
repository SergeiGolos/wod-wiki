import { expect, test } from '@playwright/test';
import { seedNote } from '../helpers/wodwikiDb';

test('CodeMirror accepts typing and Enter inside wod code fences', async ({ page }) => {
  const id = 'codemirror-wod-editing-regression';
  const content = '# Repro\n\n```wod\nTimer: 1:00\n```\n';
  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await seedNote(page, `playground/${id}`, content, { type: 'playground', title: id });

  await page.goto(`/playground/${id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.cm-content[contenteditable="true"]', { timeout: 15_000 });

  const before = await page.evaluate(() => {
    const view = document.querySelector('.cm-editor')?.parentElement?.__codemirrorView;
    if (!view) throw new Error('CodeMirror view was not exposed for test automation');

    const doc = view.state.doc.toString();
    const pos = doc.indexOf('Timer: 1:00') + 'Timer'.length;
    view.dispatch({ selection: { anchor: pos } });
    view.focus();
    return { doc, selection: view.state.selection.main.head };
  });

  await page.keyboard.type('X');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Y');

  const after = await page.evaluate(() => {
    const view = document.querySelector('.cm-editor')?.parentElement?.__codemirrorView;
    if (!view) throw new Error('CodeMirror view was not exposed for test automation');

    return {
      doc: view.state.doc.toString(),
      selection: view.state.selection.main.head,
    };
  });

  const relevantErrors = consoleErrors.filter((entry) =>
    /hasChild|TreeBuffer|CodeMirror plugin crashed|Cannot read properties of undefined/i.test(entry),
  );

  expect(before.doc).toBe(content);
  expect(after.doc).toContain('TimerX\nY: 1:00');
  expect(after.selection).toBeGreaterThan(before.selection);
  expect(relevantErrors).toEqual([]);
});