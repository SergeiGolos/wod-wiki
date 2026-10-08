import { Link } from 'react-router-dom'

const REPO_URL = 'https://github.com/SergeiGolos/wod-wiki'

const LINK_BASE =
  'inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function TourFooter() {
  return (
    <footer data-testid="tour-footer" className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          WOD Wiki — write workouts as plain text, run them, own the data.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-2">
          <Link to="/guide/start" className={LINK_BASE}>
            Start the guide
          </Link>
          <Link to="/collections" className={LINK_BASE}>
            Collections
          </Link>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={LINK_BASE}>
            Source
          </a>
          <a
            href={`${REPO_URL}/blob/HEAD/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_BASE}
          >
            License
          </a>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className={LINK_BASE}>
            Support
          </a>
        </nav>
      </div>
    </footer>
  )
}
