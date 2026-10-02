import { expect, test } from '@playwright/test'
import { seedNote } from '../helpers/wodwikiDb'

test.describe('Explore navigation', () => {
  test('opens the explorer from the dashboards nav and exposes dashboard slots in L2', async ({ page }) => {
    // The L2 dashboards panel mounts on /dashboard/* routes, so seed one
    // vault dashboard to expose a catalog row; .first() scopes to the
    // desktop sidebar nav (SidebarLayout wraps the rail + sidebar in <nav>).
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await seedNote(
      page,
      'dashboard/e2e-nav-dashboard',
      '---\ndashboard: true\nslug: e2e-nav-dashboard\ntitle: E2E Nav Dashboard\n---\n\n# E2E Nav Dashboard\n',
      { type: 'dashboard', title: 'E2E Nav Dashboard' },
    )
    await page.goto('/dashboard/e2e-nav-dashboard', { waitUntil: 'domcontentloaded' })

    const navigation = page.getByRole('navigation').first()
    // Dashboard is the active L1; the explorer + dashboard slots live in L2.
    await expect(navigation.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible()
    const explore = navigation.getByRole('button', { name: 'Explorer', exact: true })
    await expect(explore).toBeVisible()
    // Dashboard slots are exposed in L2: the vault dashboard row plus the
    // New dashboard action.
    await expect(navigation.getByRole('button', { name: 'E2E Nav Dashboard' })).toBeVisible()
    await expect(navigation.getByRole('button', { name: 'New dashboard' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'E2E Nav Dashboard' })).toBeVisible()

    await explore.click()

    // The explorer lives at /dashboards (legacy /dashboard redirects there).
    await expect(page).toHaveURL(/\/dashboards(?:\?.*)?$/)
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
