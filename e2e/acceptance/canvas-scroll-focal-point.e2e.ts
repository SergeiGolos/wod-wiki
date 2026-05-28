import { test, expect, Page } from '@playwright/test';

const STORY_URL =
  '/iframe.html?id=catalog-organisms-markdowncanvaspage--long-content-with-scroll&viewMode=story';
const STORY_LOAD_TIMEOUT_MS = 20_000;

/**
 * Capture console / page errors so we can fail cleanly on unexpected output.
 */
function setupErrorCapture(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (text.includes('404')) return;
    errors.push(text);
  });
  return errors;
}

/**
 * Wait until the canvas sections are rendered and the IntersectionObserver
 * has had a chance to run.
 */
async function waitForCanvasReady(page: Page) {
  await page.waitForSelector('[data-section-id]', { timeout: 10_000 });
  // Give the observer + RAF a tick to settle.
  await page.waitForTimeout(300);
}

/**
 * Return the currently-active section id according to the DOM
 * (the one with the progress bar at full scale/opacity).
 */
async function getActiveSectionId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll('[data-section-id]'));
    for (const el of sections) {
      const bar = el.querySelector('.scale-y-100.opacity-100');
      if (bar) return el.getAttribute('data-section-id');
    }
    return null;
  });
}

/**
 * Scroll a section into the focal zone (top of viewport minus sticky offset).
 */
async function scrollSectionToTop(page: Page, sectionId: string) {
  await page.evaluate((id) => {
    const el = document.querySelector(`[data-section-id="${id}"]`);
    if (!el) return;
    const stickyOffset = 120; // approximates getPageStickyOffset fallback
    const y = (el as HTMLElement).getBoundingClientRect().top + window.scrollY - stickyOffset;
    window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
  }, sectionId);
}

test.describe('Canvas scroll focal-point tracking', () => {
  test('first content section is focal on initial load', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await page.goto(STORY_URL, {
      waitUntil: 'networkidle',
      timeout: STORY_LOAD_TIMEOUT_MS,
    });
    await waitForCanvasReady(page);

    const activeId = await getActiveSectionId(page);
    // The first observed content section is "warm-up" (sections[1] after hero).
    expect(activeId).toBe('warm-up');

    expect(errors, 'Console/page errors on initial load').toHaveLength(0);
  });

  test('scrolling down shifts focal point to later section', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await page.goto(STORY_URL, {
      waitUntil: 'networkidle',
      timeout: STORY_LOAD_TIMEOUT_MS,
    });
    await waitForCanvasReady(page);

    // Scroll "conditioning" section into focal point.
    await scrollSectionToTop(page, 'conditioning');
    await page.waitForTimeout(400); // observer debounce + transition

    const activeId = await getActiveSectionId(page);
    expect(activeId).toBe('conditioning');

    expect(errors, 'Console/page errors during down-scroll').toHaveLength(0);
  });

  test('scrolling up shifts focal point back to earlier section', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await page.goto(STORY_URL, {
      waitUntil: 'networkidle',
      timeout: STORY_LOAD_TIMEOUT_MS,
    });
    await waitForCanvasReady(page);

    // First go down.
    await scrollSectionToTop(page, 'reflection');
    await page.waitForTimeout(400);
    expect(await getActiveSectionId(page)).toBe('reflection');

    // Then scroll back up.
    await scrollSectionToTop(page, 'strength-block');
    await page.waitForTimeout(400);

    const activeId = await getActiveSectionId(page);
    expect(activeId).toBe('strength-block');

    expect(errors, 'Console/page errors during up-scroll').toHaveLength(0);
  });

  test('focal point stays stable after mount without user scroll', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await page.goto(STORY_URL, {
      waitUntil: 'networkidle',
      timeout: STORY_LOAD_TIMEOUT_MS,
    });
    await waitForCanvasReady(page);

    // Read focal point immediately.
    const id1 = await getActiveSectionId(page);
    expect(id1).toBe('warm-up');

    // Wait a bit longer without scrolling.
    await page.waitForTimeout(800);

    const id2 = await getActiveSectionId(page);
    expect(id2).toBe('warm-up');

    expect(errors, 'Console/page errors during stability check').toHaveLength(0);
  });

  test('mobile viewport tracks focal point correctly', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(STORY_URL, {
      waitUntil: 'networkidle',
      timeout: STORY_LOAD_TIMEOUT_MS,
    });
    await waitForCanvasReady(page);

    // On mobile the panel sits at top, but section observer still runs.
    await scrollSectionToTop(page, 'cooldown');
    await page.waitForTimeout(400);

    const activeId = await getActiveSectionId(page);
    expect(activeId).toBe('cooldown');

    expect(errors, 'Console/page errors on mobile').toHaveLength(0);
  });
});
