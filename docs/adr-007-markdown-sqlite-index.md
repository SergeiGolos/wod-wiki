# ADR-007: Markdown-to-SQLite Index for Client-Side Search

## Status
Proposed

## Context

The wod-wiki project maintains ~720 markdown files across 63 collections under `markdown/collections/`. These files contain workout definitions, collection metadata, and effort descriptions. Two file types exist:

1. **Collection READMEs** (`README.md` in each subdirectory): Define collection-level metadata with YAML frontmatter (`template`, `collection: true`, `category: [...]`)
2. **Effort files** (individual `.md` files): Define individual workouts with inline metadata (Category, Type, Difficulty) or YAML frontmatter (date, original_url, wayback_url)

Current discovery relies on filesystem traversal at runtime. This is slow, cannot support full-text search, and requires the entire markdown corpus to be available as individual files.

We need a search-capable index that:
- Supports fast full-text search across all markdown content
- Allows filtering by collection, category, type, difficulty
- Can be deployed as a static artifact alongside the markdown files
- Works offline once pulled down by the client

## Decision

We will build a build-time indexer that compiles all markdown files into a SQLite database with FTS5 full-text search, then deploy both the database and the original markdown files to a dedicated GitHub Pages site (similar to storybook/preview deploy pattern).

### Schema Design

```sql
-- Collections table: one row per subdirectory README.md
CREATE TABLE collections (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT NOT NULL UNIQUE,     -- directory name (e.g., "crossfit-girls")
    name            TEXT NOT NULL,             -- derived from H1 or frontmatter title
    description     TEXT,                      -- body text of README.md
    categories      TEXT,                      -- JSON array from frontmatter category
    template        TEXT,                      -- frontmatter template value
    file_path       TEXT NOT NULL,             -- relative path: collections/{slug}/README.md
    effort_count    INTEGER DEFAULT 0,         -- computed: count of efforts in collection
    created_at      TEXT,                      -- ISO 8601 from frontmatter or file mtime
    updated_at      TEXT                       -- ISO 8601 from frontmatter or file mtime
);

-- Efforts table: one row per non-README .md file
CREATE TABLE efforts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id   INTEGER NOT NULL REFERENCES collections(id),
    slug            TEXT NOT NULL,             -- filename without .md
    title           TEXT NOT NULL,             -- H1 heading or frontmatter title
    content         TEXT NOT NULL,             -- full markdown body (without frontmatter)
    category        TEXT,                      -- inline/frontmatter Category
    type            TEXT,                      -- inline/frontmatter Type
    difficulty      TEXT,                      -- inline/frontmatter Difficulty
    date            TEXT,                      -- ISO 8601 date from frontmatter
    original_url    TEXT,                      -- frontmatter original_url
    wayback_url     TEXT,                      -- frontmatter wayback_url
    file_path       TEXT NOT NULL,             -- relative path: collections/{slug}/{filename}.md
    created_at      TEXT,
    updated_at      TEXT,
    UNIQUE(collection_id, slug)
);

-- FTS5 virtual table for full-text search across efforts
CREATE VIRTUAL TABLE efforts_fts USING fts5(
    title,
    content,
    category,
    type,
    difficulty,
    content='efforts',
    content_rowid='id'
);

-- FTS5 virtual table for collection search
CREATE VIRTUAL TABLE collections_fts USING fts5(
    name,
    description,
    categories,
    content='collections',
    content_rowid='id'
);

-- Triggers to keep FTS indexes in sync
CREATE TRIGGER efforts_ai AFTER INSERT ON efforts BEGIN
    INSERT INTO efforts_fts(rowid, title, content, category, type, difficulty)
    VALUES (new.id, new.title, new.content, new.category, new.type, new.difficulty);
END;

CREATE TRIGGER efforts_ad AFTER DELETE ON efforts BEGIN
    INSERT INTO efforts_fts(efforts_fts, rowid, title, content, category, type, difficulty)
    VALUES ('delete', old.id, old.title, old.content, old.category, old.type, old.difficulty);
END;

CREATE TRIGGER efforts_au AFTER UPDATE ON efforts BEGIN
    INSERT INTO efforts_fts(efforts_fts, rowid, title, content, category, type, difficulty)
    VALUES ('delete', old.id, old.title, old.content, old.category, old.type, old.difficulty);
    INSERT INTO efforts_fts(rowid, title, content, category, type, difficulty)
    VALUES (new.id, new.title, new.content, new.category, new.type, new.difficulty);
END;

-- Similar triggers for collections_fts
```

### Deployment Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  wod-wiki repo  │────▶│  indexer (build) │────▶│  search.wod.wiki│
│  markdown/      │     │  - parse .md     │     │  (GitHub Pages) │
│  collections/   │     │  - build .db     │     │  - index.db     │
└─────────────────┘     │  - copy .md      │     │  - collections/ │
                        └──────────────────┘     │  - search UI    │
                                                 └─────────────────┘
```

The deployment repo (`wod-wiki-search`) follows the same pattern as `wod-wiki-preview` and `wod-wiki-storybook`:
- Triggered by dispatch from `wod-wiki` on push to `dev`
- Manual dispatch with branch parameter
- Builds the SQLite DB, copies markdown files, builds a minimal search UI
- Deploys to GitHub Pages at `search.wod.wiki`

### Indexer Implementation

The indexer is a Node.js/Bun script that:
1. Walks `markdown/collections/` recursively
2. Parses each `.md` file:
   - Extracts YAML frontmatter (if present)
   - Extracts H1 title from body
   - Strips frontmatter for `content` column
3. Inserts into SQLite with `better-sqlite3`
4. FTS5 indexes are populated via triggers
5. Outputs `index.db` + copies original `.md` files to `dist/`

### Client-Side Usage

The search UI is a static SPA that:
1. Loads `index.db` via `sql.js` (SQLite compiled to WASM)
2. Runs FTS5 queries in the browser
3. Renders results with links to individual markdown files
4. Supports offline use after initial load (Service Worker caches DB + files)

## Consequences

### Positive
- Full-text search across ~720 files with sub-100ms query times
- Single artifact (`index.db`, ~2-5MB estimated) vs 720 individual files
- Works offline after initial pull
- Schema supports future extensions (tags, equipment, muscle groups)
- Reuses existing deployment infrastructure (dispatch pattern, GitHub Pages)

### Negative
- Additional build step in CI (estimated +10-15s)
- Database must be regenerated on every content change
- FTS5 query syntax is less forgiving than simple string matching
- sql.js WASM payload is ~1MB gzipped

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| DB size grows unwieldy | Compress with gzip; benchmark at 10K files |
| FTS5 syntax confusion | UI exposes structured filters (dropdowns) + simple search box that wraps queries |
| Build fragility | Indexer validates schema on every build; fails CI on parse errors |

## Alternatives Considered

### 1. Lunr.js / FlexSearch in-memory index
- **Rejected**: Requires loading all markdown content into memory at runtime. With 720+ files, this is feasible now but won't scale. Also requires client-side parsing of all files.

### 2. Elasticsearch / Algolia
- **Rejected**: Requires hosted infrastructure, ongoing cost, and network dependency. Contradicts the offline-first goal.

### 3. Keep files as-is, use browser's native File System API
- **Rejected**: No full-text search capability. File traversal is slow and requires complex caching logic.

### 4. JSON index instead of SQLite
- **Rejected**: JSON lacks full-text search. Would require building a secondary index structure (essentially reimplementing FTS5). SQLite is a proven, compact solution.

## Related
- ADR-003: Preview deployment pattern (repository dispatch + GitHub Pages)
- ADR-005: Storybook static deployment
- PRD: Markdown Search Deployment (companion document)
