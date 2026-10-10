import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cloud, GitFork, Timer } from 'lucide-react'
import { Button } from '@/components/atoms/primitives/button'
import { Input } from '@/components/atoms/primitives/input'
import { resetUserData } from '../../services/resetUserData'
import { ROUTE_PATTERNS } from '../../lib/routes'

// ponytail: hello@wod.wiki assumed — no contact address exists in the repo yet.
const REPO_URL = 'https://github.com/SergeiGolos/wod-wiki'
const CONTACT_EMAIL = 'hello@wod.wiki'

function CardShell(props: { icon: typeof Timer; title: string; children: React.ReactNode }) {
  const Icon = props.icon
  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white/60 p-5 dark:border-zinc-700 dark:bg-zinc-900/60">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        <Icon className="size-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
        {props.title}
      </h3>
      {props.children}
    </article>
  )
}

export function OfferingTiers() {
  const [email, setEmail] = useState('')
  const [clearing, setClearing] = useState(false)
  const [interestSent, setInterestSent] = useState(false)

  const clearData = async () => {
    if (!window.confirm('Wipe every note, result, and setting stored in this browser? This cannot be undone.')) return
    setClearing(true)
    await resetUserData()
    window.location.reload()
  }

  // ponytail: no interest-collection endpoint yet — hands off to the visitor's
  // mail client; swap for POST /v1/interest when the API grows one.
  const INTEREST_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('wod.wiki hosted — interested')}&body=`

  return (
    <section aria-label="Ways to run Wod Wiki" className="mt-12">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        Offerings
      </p>
      <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Three ways to run Wod Wiki
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <CardShell icon={Timer} title="Playground">
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            This browser holds your data — clear it here and it&rsquo;s gone. No
            account, no cloud copy. Share timer blocks as links. Everything you
            see here, in its very ephemeral way, is yours.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button asChild size="sm">
              <Link to={ROUTE_PATTERNS.playgroundRoot}>Open the playground</Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={clearData} disabled={clearing}>
              {clearing ? 'Clearing…' : 'Clear my data'}
            </Button>
          </div>
        </CardShell>

        <CardShell icon={GitFork} title="Self-hosted">
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Wod Wiki is open source. You are welcome to run and fiddle with
            your own version.
          </p>
          <div className="mt-4">
            <Button variant="outline" size="sm" asChild>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                View source
                <GitFork className="ml-1.5 size-3.5" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </CardShell>

        <CardShell icon={Cloud} title="Hosted by wod.wiki">
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            We run it for you — as nothing more than custodians of your data.
            It stays yours; we just keep it safe.
          </p>
          <form
            className="mt-4 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setInterestSent(true)
              window.location.href = INTEREST_MAILTO + encodeURIComponent(email + '\n')
            }}
          >
            <label
              htmlFor="interest-email"
              className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400"
            >
              Email
            </label>
            <Input
              id="interest-email"
              type="email"
              required
              placeholder="you@example.com"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" variant="outline" size="sm" className="shrink-0">
              Show interest
            </Button>
          </form>
          {interestSent && (
            <p role="status" className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
              Your mail client should open — or write to {CONTACT_EMAIL} directly.
            </p>
          )}
        </CardShell>
      </div>
    </section>
  )
}
