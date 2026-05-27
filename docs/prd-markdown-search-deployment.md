# PRD: Markdown Search Deployment

## Problem Statement

The wod-wiki project has ~720 markdown files across 63 collections. There is no fast way to search across these files. Users must either browse collection-by-collection or rely on external tools. We need a searchable index that can be deployed as a static site and used offline.

## Solution

Build a build-time indexer that compiles all markdown into a SQLite database with FTS5 full-text search, deploy it alongside the original markdown files to a dedicated GitHub Pages site (`search.wod.wiki`), and provide a minimal search UI that runs entirely in the browser using sql.js.

## User Stories

1. As a fitness enthusiast, I want to search for workouts by exercise name (e.g., "kettlebell swing"), so that I can find relevant workouts quickly.
2. As a coach, I want to filter workouts by type ("For Time", "AMRAP", "EMOM"), so that I can program sessions efficiently.
3. As a user, I want to filter by difficulty ("Beginner", "Intermediate", "Advanced"), so that I find appropriate workouts for my level.
4. As a researcher, I want to search within a specific collection (e.g., "crossfit-girls"), so that I can narrow results to a known source.
5. As a mobile user, I want the search to work offline after the first load, so that I can use it at the gym without connectivity.
6. As a content contributor, I want the search index to update automatically when I push new markdown, so that I don't need manual reindexing.
7. As a developer, I want the indexer to fail the build on parse errors, so that malformed markdown doesn't silently break search.
8. As a user, I want to see a preview of the markdown content in search results, so that I can judge relevance before opening.
9. As a user, I want to click a search result and view the full markdown file, so that I can read the complete workout definition.
10. As an admin, I want the deployment to use the same dispatch pattern as preview/storybook, so that infrastructure remains consistent.
11. As a user, I want search queries to tolerate typos and partial matches, so that I find results even with imperfect spelling.
12. As a developer, I want the database schema to support future extensions (tags, equipment, muscle groups), so that the index can grow with the product.

## Implementation Decisions

### Module: Indexer (`tools/search-indexer/`)

A Bun/Node.js CLI tool that parses markdown files and builds the SQLite database.

**Interface:**
```bash
bun run tools/search-indexer/index.ts \
  --source markdown/collections \
  --output dist/index.db \
  --copy-files dist/collections
```

**Responsibilities:**
- Walk `markdown/collections/` recursively
- Parse YAML frontmatter and inline metadata
- Extract H1 titles
- Populate `collections`, `efforts`, `efforts_fts`, `collections_fts` tables
- Copy original `.md` files to output directory preserving structure
- Validate schema constraints (unique slugs, required fields)
- Exit non-zero on parse errors (fails CI)

**Key parsing rules:**
- Frontmatter: YAML between `---` delimiters at file start
- Inline metadata: `**Key**: Value` pattern in first 20 lines
- Title: First `# ` heading, or `title` frontmatter, or filename
- Content: Everything after frontmatter, with inline metadata lines stripped

### Module: Search UI (`search-ui/`)

A minimal static SPA built with vanilla TypeScript + Vite.

**Interface:**
- Loads `index.db` via sql.js WASM
- Renders search box + filter dropdowns (collection, type, difficulty)
- Displays results with title, snippet, metadata
- Links to `collections/{slug}/{file}.md` for full content

**Tech choices:**
- sql.js (SQLite in WASM) — no backend required
- Vite for bundling
- No framework (vanilla TS) — keeps bundle small
- Service Worker for offline caching

### Module: Deployment (`wod-wiki-search` repo)

Follows the established dispatch pattern:

1. `wod-wiki` pushes to `dev` → dispatches `wod-wiki-search`
2. `wod-wiki-search` workflow:
   - Clones `wod-wiki` at specified branch
   - Runs indexer → produces `dist/index.db` + `dist/collections/`
   - Builds search UI → `dist/` root
   - Deploys `dist/` to GitHub Pages

**GitHub Pages config:**
- Custom domain: `search.wod.wiki`
- Base path: `/` (root, like preview)
- SPA fallback: `404.html` for deep links

### Schema Decisions

The schema (defined in ADR-007) uses two main tables:

- `collections`: Collection-level metadata from README.md files
- `efforts`: Individual workout files
- `efforts_fts` / `collections_fts`: FTS5 virtual tables for full-text search

**Why FTS5 over LIKE queries:**
- FTS5 supports stemming, prefix matching, and relevance ranking
- Query performance is O(log n) vs O(n) for LIKE
- Built-in snippet generation for search results

**Why separate collections and efforts tables:**
- Collections are browsable entities (users want to see "all CrossFit Girls")
- Efforts belong to exactly one collection
- Enables filtering by collection slug in effort searches

### Search Query Design

The UI converts user input to FTS5 queries:

| User Input | FTS5 Query |
|------------|------------|
| `kettlebell swing` | `kettlebell swing` (AND by default) |
| `"kettlebell swing"` | `"kettlebell swing"` (phrase) |
| `swing -kettlebell` | `swing NOT kettlebell` |
| `swing*` | `swing*` (prefix) |

Structured filters are applied as SQL `WHERE` clauses alongside the FTS match.

## Testing Decisions

### Indexer Tests
- **Unit tests** for parser functions (frontmatter extraction, title parsing, inline metadata)
- **Integration tests** that run the indexer on a fixture directory and assert DB contents
- **Schema validation tests** that verify foreign key constraints and unique indexes

### Search UI Tests
- **E2E tests** with Playwright: load the search page, type a query, assert results appear
- **Offline tests**: verify Service Worker caches DB and files

### Performance Tests
- Indexer must complete in < 30s for 720 files
- FTS queries must return in < 100ms on representative hardware
- Initial DB load (WASM + file) must complete in < 3s on 4G

## Out of Scope

- Real-time index updates (the index is rebuilt on every deployment)
- User-generated content or ratings
- Advanced search syntax (boolean operators beyond AND/OR/NOT)
- Multi-language support (English content only for now)
- Analytics or search logging
- Backend API (entirely client-side)

## Further Notes

### File Size Estimates
- `index.db`: ~2-5MB (720 files, FTS5 index overhead ~2x content size)
- sql.js WASM: ~1MB gzipped
- Search UI bundle: ~50KB
- Total initial load: ~4-7MB

### Future Extensions
The schema reserves space for:
- `tags` table (many-to-many with efforts)
- `equipment` table (many-to-many with efforts)
- `muscles` table (many-to-many with efforts)
- `efforts.wod_script` column (extracted ```wod blocks)

These can be added without breaking existing queries.

### Deployment Domain
The custom domain `search.wod.wiki` should be configured in the `wod-wiki-search` repo settings. If not available, the GitHub Pages default URL is acceptable for initial launch.
