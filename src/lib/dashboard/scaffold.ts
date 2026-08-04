/**
 * buildDashboardScaffold — raw markdown for a freshly created dashboard note
 * (#907 creation flow, format locked in #899).
 *
 * The scaffold demonstrates the format end to end on first open: frontmatter
 * with `dashboard: true` + a starter token set, then one heading / question /
 * ```query block whose WQL references a declared token, so the token controls
 * and substitution have something to work with immediately. New notes are
 * created active (`dashboard.active: true`) and carry a route slug
 * (/dashboard/:slug) — the creation flow deactivates any previously active
 * dashboard.
 */

export const DEFAULT_DASHBOARD_TITLE = 'New Dashboard';

/** Slugify a dashboard title for route addressing (/dashboard/:slug). */
export function dashboardSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'dashboard';
}

export function buildDashboardScaffold(title: string = DEFAULT_DASHBOARD_TITLE): string {
  return `---
dashboard: true
dashboard.active: true
title: ${title}
slug: ${dashboardSlug(title)}
dashboard.metric: [totalVolume, totalReps]
---

## Weekly Trend
How does $metric trend week over week?

\`\`\`query:timeseries
sum:$metric{} rollup:1w
\`\`\`
`;
}
