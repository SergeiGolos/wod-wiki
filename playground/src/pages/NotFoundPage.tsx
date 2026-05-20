/**
 * NotFoundPage — 404 fallback for unknown routes.
 *
 * Replaces the previous wildcard catch-all that silently rendered AppContent.
 */

import { useNavigate } from 'react-router-dom'
import { FileQuestion, Home } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
        <FileQuestion className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground max-w-sm">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Home className="w-4 h-4" />
        Go home
      </button>
    </div>
  )
}
