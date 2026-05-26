import { expect, test, type Page } from '@playwright/test'

function monitorPageErrors(page: Page) {
  const pageErrors: string[] = []

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  return { pageErrors }
}

test.describe('Concept 3 landing page', () => {
  test('renders the grounded storytelling hero, pillars, and runtime toggle', async ({ page }) => {
    const { pageErrors } = monitorPageErrors(page)

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 })

    await expect(page.getByRole('heading', { name: 'Stop tap-dancing with fitness apps. Just type.' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open Sandbox Editor' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Read Syntax Docs' })).toBeVisible()
    await expect(page.getByText('wod', { exact: true })).toBeVisible()
    await expect(page.getByText('log', { exact: true })).toBeVisible()
    await expect(page.getByText('wiki', { exact: true })).toBeVisible()
    await expect(page.getByText('Chromecast and big-screen casting')).toBeVisible()
    await expect(page.getByTestId('concept3-editor-panel')).toBeVisible()
    await expect(page.getByTestId('concept3-scroll-progress')).toBeAttached()

    const runButton = page.getByRole('button', { name: 'Start workout' })
    await expect(runButton).toBeVisible()
    await runButton.click()

    await expect(page.getByRole('button', { name: /Return to editor/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible({ timeout: 15_000 })

    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
    await page.waitForTimeout(250)

    const progressWidth = await page.getByTestId('concept3-scroll-progress').evaluate((element) => {
      return (element as HTMLElement).style.width
    })
    expect(progressWidth).not.toBe('0%')

    expect(pageErrors).toEqual([])
  })

  test('collapses into a single column on mobile and keeps the sandbox CTA visible', async ({ page }) => {
    const { pageErrors } = monitorPageErrors(page)

    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 })

    await expect(page.getByRole('heading', { name: 'Stop tap-dancing with fitness apps. Just type.' })).toBeVisible()
    await expect(page.getByTestId('concept3-mobile-editor-cta')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start workout' })).toBeVisible()

    await page.getByTestId('concept3-mobile-editor-cta').click()
    await expect(page.getByTestId('concept3-editor-panel')).toBeVisible()

    expect(pageErrors).toEqual([])
  })

  test('preserves the previous playground landing page at /legacy', async ({ page }) => {
    const { pageErrors } = monitorPageErrors(page)

    await page.goto('/legacy', { waitUntil: 'domcontentloaded', timeout: 20_000 })

    await expect(page.getByRole('heading', { name: 'Build and preview widget-driven workout pages.' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run this example' })).toBeVisible()

    expect(pageErrors).toEqual([])
  })
})
