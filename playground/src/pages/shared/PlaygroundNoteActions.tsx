import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowPathIcon } from '@heroicons/react/20/solid'
import { PlusIcon } from '@heroicons/react/16/solid'

import { CastButtonRpc } from '@/components/cast/CastButtonRpc'
import { Button } from '@/components/ui/button'
import type { PageNavLink } from '@/components/playground/PageNavDropdown'

import { ActionsMenu } from './PageToolbar'
import { mapIndexToL3 } from './pageUtils'
import { EMPTY_PLAYGROUND_CONTENT } from '../../templates/defaultPlaygroundContent'
import { createPlaygroundPage } from '../../services/createPlaygroundPage'

export interface PlaygroundNoteActionsProps {
  currentWorkout: { name: string; content: string }
  index: PageNavLink[]
  onReset: () => Promise<void> | void
}

export function PlaygroundNoteActions({ currentWorkout, index, onReset }: PlaygroundNoteActionsProps) {
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
    if (isResetting) return
    setIsResetting(true)
    try {
      await onReset()
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleCreateNew} disabled={isCreating} className="gap-2">
          <PlusIcon className="size-4" />
          <span>New</span>
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={handleReset}
          disabled={isResetting}
          aria-label="Reset playground to default"
          title="Reset to default home workout"
          className="size-9"
        >
          <ArrowPathIcon className="size-4" />
        </Button>
      </div>
      <CastButtonRpc />
      <ActionsMenu currentWorkout={currentWorkout} items={mapIndexToL3(index)} />
    </div>
  )
}