import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { createPlaygroundPage } from '../services/createPlaygroundPage'
import { EMPTY_PLAYGROUND_CONTENT } from '../templates/defaultPlaygroundContent'

/**
 * Canonical entry route for both `/` and `/playground`.
 *
 * Always creates a fresh playground note, then redirects to `/playground/:id`.
 */
export function PlaygroundRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const id = await createPlaygroundPage(EMPTY_PLAYGROUND_CONTENT.content)
      if (!cancelled) {
        navigate(`/playground/${encodeURIComponent(id)}`, { replace: true })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="flex-1 flex items-center justify-center text-zinc-400">
      Loading…
    </div>
  )
}
