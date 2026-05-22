import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { playgroundPath } from '../lib/routes'
import { createPlaygroundPage } from '../services/createPlaygroundPage'
import { DEFAULT_PLAYGROUND_CONTENT, EMPTY_PLAYGROUND_CONTENT } from '../templates/defaultPlaygroundContent'

export interface PlaygroundRedirectProps {
  template?: 'empty' | 'home'
}

/**
 * Canonical entry route for `/` and `/playground`.
 *
 * Always creates a fresh playground note, then redirects to `/playground/:id`.
 */
export function PlaygroundRedirect({
  template = 'empty',
}: PlaygroundRedirectProps) {
  const navigate = useNavigate()
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const templateContent = template === 'home'
    ? DEFAULT_PLAYGROUND_CONTENT.content
    : EMPTY_PLAYGROUND_CONTENT.content

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const id = await createPlaygroundPage(templateContent)
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
  }, [navigate, attempt, templateContent])

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
