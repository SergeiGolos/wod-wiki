/**
 * LoadZipPage — /load?zip=<base64>
 *
 * Decodes a base64-encoded zip from the query string, saves it as a playground
 * page, then redirects to that page. If no zip parameter is present the user
 * is redirected to /playground.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryState } from 'nuqs'

export function LoadZipPage() {
  const navigate = useNavigate()
  const [zip] = useQueryState('zip')
  const [z] = useQueryState('z')

  // Robust check: was there a zip in the search string on mount?
  const [hasZipOnMount] = useState(() => {
    const s = window.location.search
    return s.includes('zip=') || s.includes('z=')
  })

  useEffect(() => {
    // Only redirect if there's no zip in state AND no zip was present on mount.
    // If a zip WAS present on mount, useZipProcessor (global) is handling it.
    if (!zip && !z && !hasZipOnMount) {
      navigate('/playground', { replace: true })
    }
  }, [zip, z, navigate, hasZipOnMount])

  return (
    <div className="flex-1 flex items-center justify-center text-zinc-400">
      Loading…
    </div>
  )
}
