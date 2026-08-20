import { expect, test, type Page } from '@playwright/test'
import { TEST_IDS } from '../contracts/TestIdContract'

function monitorPageErrors(page: Page) {
  const pageErrors: string[] = []

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  return { pageErrors }
}

test.describe('Legacy landing page', () => {
  test('preserves the previous playground landing page at /legacy and does not render onboarding UI', async ({ page }) => {
    const { pageErrors } = monitorPageErrors(page)

    await page.goto('/legacy', { waitUntil: 'domcontentloaded', timeout: 20_000 })

    await expect(page.getByRole('heading', { name: 'Build and preview widget-driven workout pages.' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run this example' })).toBeVisible()

    // ADR-0010 boundary: the Goal Gradient banner lives on the canvas home
    // (`/`) only. The legacy landing must not render it (no "Step 1 of N"
    // credit, no "Getting started" progress label).
    await expect(page.getByText(/Step 1 of \d+/)).toHaveCount(0)
    await expect(page.getByText('Getting started')).toHaveCount(0)

    expect(pageErrors).toEqual([])
  })
})
