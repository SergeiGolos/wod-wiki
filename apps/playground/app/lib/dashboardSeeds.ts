/**
 * dashboardSeeds — pure derivation of the prebuilt dashboard seeds from the
 * seeded corpus (docs/prototypes/seed-data-unification.md § Module 3).
 *
 * Each seed's slug is its frontmatter `slug:` if present, else the filename —
 * matching how vault dashboard notes are addressed (slug frontmatter). The
 * old build-time glob (dashboardCorpus) is gone; the raw markdown comes from
 * the seed-content snapshot (markdown/dashboards/**).
 */
import { parseFrontmatter } from '@/lib/frontmatter'
import type { SeedContentFiles } from '@/services/content/seedContent'

export interface DashboardSeed {
  slug: string
  title: string
  rawContent: string
}

export function buildDashboardSeeds(files: SeedContentFiles): DashboardSeed[] {
  return Object.entries(files)
    .filter(([path]) => path.startsWith('markdown/dashboards/'))
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
}
