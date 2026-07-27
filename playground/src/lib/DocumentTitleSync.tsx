import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Route-level document title sync. Sets a base page title from the current
 * route, leaving leaf routes such as /effort/:slug and /playground/:id alone
 * so their own effects can set a dynamic title.
 */
export function DocumentTitleSync() {
  const location = useLocation()

  useEffect(() => {
    const pathname = location.pathname

    if (pathname.startsWith('/effort/') || pathname.startsWith('/playground/')) {
      return
    }

    let title = 'Wod.Wiki'
    if (pathname.startsWith('/journal')) title = 'Wod.Wiki - Journal'
    else if (pathname.startsWith('/feeds')) title = 'Wod.Wiki - Feeds'
    else if (pathname.startsWith('/collections')) title = 'Wod.Wiki - Collections'
    else if (pathname.startsWith('/efforts')) title = 'Wod.Wiki - Efforts'
    else if (pathname.startsWith('/analytics')) title = 'Wod.Wiki - Analytics'
    else if (pathname.startsWith('/review')) title = 'Wod.Wiki - Review'

    document.title = title
  }, [location.pathname])

  return null
}
