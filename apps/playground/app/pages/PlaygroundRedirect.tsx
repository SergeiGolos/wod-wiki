import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { playgroundPath } from '../lib/routes'
import { playgroundContent } from '../services/playgroundContent'
import { createPlaygroundPage } from '../services/createPlaygroundPage'
import { DEFAULT_PLAYGROUND_CONTENT } from '../templates/defaultPlaygroundContent'

/**
 * Shared in-flight promise so that StrictMode double-mount (and rapid remounts)
 * coordinate on a single "find or create" request. The attempt field lets an
 * explicit retry mint a fresh promise instead of re-awaiting a stale one.
 */
let pendingPlaygroundId: { attempt: number; promise: Promise<string> } | null = null

async function resolvePlaygroundId(attempt: number): Promise<string> {
  if (!pendingPlaygroundId || pendingPlaygroundId.attempt !== attempt) {
    pendingPlaygroundId = {
      attempt,
      promise: (async () => {
        const pages = await playgroundContent.getPagesByCategory('playground')
        const latest = pages.sort((a, b) => b.updatedAt - a.updatedAt)[0]
        if (latest) {
          // PlaygroundNotePage treats the route param as the NAME within the
          // playground category (note id = `playground/<param>`), so hand it
          // the route id with the category prefix stripped.
          const routeId = latest.slug ?? latest.id
          return routeId.startsWith('playground/') ? routeId.slice('playground/'.length) : routeId
        }
        return createPlaygroundPage(DEFAULT_PLAYGROUND_CONTENT.content)
      })(),
    }
  }

  try {
    return await pendingPlaygroundId.promise
  } finally {
    if (pendingPlaygroundId?.attempt === attempt) {
      pendingPlaygroundId = null
    }
  }
}

/**
 * Canonical entry route for `/playground`.
 *
 * Resumes the most recently updated playground note when one exists; creates
 * a fresh empty playground note only when none exists yet. The first-note
 * wizard is unaffected: it gates on profile state and opens on the note page
 * itself, not on whether the note was freshly minted.
 */
export function PlaygroundRedirect() {
  const navigate = useNavigate()
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const id = await resolvePlaygroundId(attempt)
        if (!cancelled) {
          navigate(playgroundPath(id), { replace: true })
        }
      } catch {
        if (!cancelled) {
          setError(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [navigate, attempt])

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-300 px-4 text-center">
        <p role="alert">Unable to create a new playground note.</p>
        <button
          type="button"
          className="rounded border border-zinc-600 px-3 py-1 text-sm hover:bg-zinc-800"
          onClick={() => {
            setError(false)
            setAttempt(value => value + 1)
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center text-zinc-400">
      Loading…
    </div>
  )
}
