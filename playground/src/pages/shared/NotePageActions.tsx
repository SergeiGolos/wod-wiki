/**
 * NotePageActions — Standard 5-button toolbar shared by note pages.
 *
 * Renders the same `<NewEntryButton/CastButtonRpc/AudioToggle/ThemeSwitcher/
 * ActionsMenu>` block that JournalPage, PlaygroundNotePage and
 * WorkoutEditorPage all repeat verbatim in their `<JournalPageShell actions>`
 * slot.
 */

import type { PageNavLink } from '@/components/playground/PageNavDropdown'
import { CastButtonRpc } from '@/components/cast/CastButtonRpc'
import { AudioToggle } from '@/components/audio/AudioToggle'
import { NewEntryButton, ThemeSwitcher, ActionsMenu } from './PageToolbar'
import { mapIndexToL3 } from './pageUtils'

export interface NotePageActionsProps {
  /** Workout shown in the ActionsMenu (for download). */
  currentWorkout: { name: string; content: string }
  /** Page index used to populate the "On this page" submenu. */
  index: PageNavLink[]
}

export function NotePageActions({ currentWorkout, index }: NotePageActionsProps) {
  return (
    <div className="flex items-center gap-4">
      <NewEntryButton />
      <CastButtonRpc />
      <AudioToggle />
      <ThemeSwitcher />
      <ActionsMenu currentWorkout={currentWorkout} items={mapIndexToL3(index)} />
    </div>
  )
}
