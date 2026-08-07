import { expect, test } from '@playwright/test'

test.describe('Explore navigation', () => {
  test('opens the explorer from the dashboards nav and exposes dashboard slots in L2', async ({ page }) => {
    // Legacy /analytics/dashboard redirects to the /dashboard namespace,
    // where the WQL explorer lives; .first() scopes to the desktop sidebar
    // nav (SidebarLayout wraps the inner Sidebar in its own <nav>).
    await page.goto('/analytics/dashboard', { waitUntil: 'domcontentloaded' })

    const navigation = page.getByRole('navigation').first()
    // Dashboards is the active L1; the explorer + dashboard slots live in L2.
    await expect(navigation.getByRole('button', { name: 'Dashboards', exact: true })).toBeVisible()
    const explore = navigation.getByRole('button', { name: 'Explorer', exact: true })
    await expect(explore).toBeVisible()
    // Dashboard slots are exposed in L2: the New action plus prebuilt seeds.
    await expect(navigation.getByRole('button', { name: 'New dashboard' })).toBeVisible()
    await expect(navigation.getByRole('button', { name: /prebuilt/ }).first()).toBeVisible()

    await explore.click()

    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Metric Explorer' })).toBeVisible()
  })

  test('loads without a parse error and runs an example from the combo', async ({ page }) => {
    await page.goto('/analytics/explorer', { waitUntil: 'domcontentloaded' })

    // The default draft is valid — no first-visit parse error (#897).
    await expect(page.getByText(/Cannot parse/)).toHaveCount(0)

    // Examples live in the command-bar combo; picking one hydrates and runs.
    await page.getByTestId('explorer-examples').click()
    await page.getByTestId('explorer-examples-menu').getByText('Weekly strength volume').click()
    await expect(page).toHaveURL(/[?&]q=/)
    await expect(page.getByTestId('explorer-examples')).toContainText('Weekly strength volume')
  })
})
