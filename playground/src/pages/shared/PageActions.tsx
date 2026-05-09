/**
 * PageActions — unified page-level action bar.
 *
 * Replaces NotePageActions and PlaygroundNoteActions with a single
 * mode-driven component. All pages receive [NavSearchInput, Cast, …].
 * The playground page additionally receives a [New | Reset] ButtonGroup
 * prepended to the left.
 *
 * See docs/navbar-wodblock-actions-assessment-2026-05-08.md §4 Candidate 2.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowPathIcon, PlusIcon } from '@heroicons/react/20/solid'

import { CastButtonRpc } from '@/components/cast/CastButtonRpc'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import type { PageNavLink } from '@/components/playground/PageNavDropdown'
import type { PageMode } from '@/types/content-type'

import { NavSearchInput } from '../../components/NavSearchInput'
import { ActionsMenu } from './PageToolbar'
import { mapIndexToL3 } from './pageUtils'
import { EMPTY_PLAYGROUND_CONTENT } from '../../templates/defaultPlaygroundContent'
import { createPlaygroundPage } from '../../services/createPlaygroundPage'

export interface PageActionsProps {
  /** Current page mode — controls which extras are shown. */
  mode: PageMode
  /** Used by ActionsMenu for download filename and download content. */
  currentWorkout: { name: string; content: string }
  /** Page index — shown in the ActionsMenu "On this page" section. */
  index: PageNavLink[]
  /** Opens the command palette / global search. */
  onSearch: () => void
  /**
   * Playground-only: resets the current page to its default template.
   * Required when mode === 'playground'.
   */
  onReset?: () => Promise<void> | void
}

export function PageActions({
  mode,
  currentWorkout,
  index,
  onSearch,
  onReset,
}: PageActionsProps) {
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleCreateNew = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const pageId = await createPlaygroundPage(EMPTY_PLAYGROUND_CONTENT.content)
      navigate(`/playground/${encodeURIComponent(pageId)}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleReset = async () => {
    if (!onReset || isResetting) return
    setIsResetting(true)
    try {
      await onReset()
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Playground-only: New | Reset group button */}
      {mode === 'playground' && (
        <ButtonGroup
          primary={{
            id: 'new-playground',
            label: isCreating ? 'Creating…' : 'New',
            icon: PlusIcon,
            action: { type: 'call', handler: handleCreateNew },
          }}
          secondary={{
            id: 'reset-playground',
            label: isResetting ? 'Resetting…' : 'Reset to default',
            icon: ArrowPathIcon,
            action: { type: 'call', handler: handleReset },
          }}
          size="sm"
        />
      )}

      <NavSearchInput onOpen={onSearch} />
      <CastButtonRpc />
      <ActionsMenu currentWorkout={currentWorkout} items={mapIndexToL3(index)} />
    </div>
  )
}
