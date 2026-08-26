/**
 * dashboardCorpus — the prebuilt dashboard-note seeds, loaded at build time
 * from the markdown/dashboards corpus via Vite's import.meta.glob (same
 * pattern as canvasRoutes). Dashboards are a first-class route namespace
 * (/dashboard/:slug), NOT a subdivision of collections, so they live in
 * their own corpus and render read-only until cloned into the vault.
 *
 * Each seed's slug is its frontmatter `slug:` if present, else the filename —
 * matching how vault dashboard notes are addressed (slug frontmatter).
 */
import { parseFrontmatter } from '@/lib/frontmatter'

export interface DashboardSeed {
  slug: string
  title: string
  rawContent: string
}

const seedFiles = import.meta.glob('../../../markdown/dashboards/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export const DASHBOARD_SEEDS: DashboardSeed[] = Object.entries(seedFiles)
  .map(([path, rawContent]) => {
    const { meta } = parseFrontmatter(rawContent)
    const fileSlug = path.split('/').pop()!.replace(/\.md$/, '')
    return {
      slug: typeof meta.slug === 'string' && meta.slug ? meta.slug : fileSlug,
      title: typeof meta.title === 'string' && meta.title ? meta.title : fileSlug,
      rawContent,
    }
  })
  .sort((a, b) => a.title.localeCompare(b.title))

const seedBySlug = new Map(DASHBOARD_SEEDS.map((s) => [s.slug, s]))

export function findDashboardSeed(slug: string): DashboardSeed | undefined {
  return seedBySlug.get(slug)
}
