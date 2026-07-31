import { expect, test } from '@playwright/test'

test.describe('Explore navigation', () => {
  test('opens the explorer from L1 and exposes dashboard slots in L2', async ({ page }) => {
    await page.goto('/analytics/dashboard', { waitUntil: 'domcontentloaded' })

    const navigation = page.getByRole('navigation')
    const explore = navigation.getByRole('button', { name: 'Explore', exact: true })

    await expect(explore).toBeVisible()
    await expect(navigation.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible()
    await expect(navigation.getByRole('button', { name: 'Explorer', exact: true })).toHaveCount(0)
    await expect(navigation.getByRole('button', { name: 'Add dashboard (coming soon)' })).toHaveText('+')
    await expect(navigation.getByRole('button', { name: 'Add dashboard (coming soon)' })).toBeDisabled()

    await explore.click()

    await expect(page).toHaveURL(/\/analytics\/explorer(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Metric Explorer' })).toBeVisible()
  })
})
