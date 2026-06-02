/**
 * Shared toolbar UI components for playground page components.
 *
 * Extracted from App.tsx so individual page components can be imported in
 * isolation (e.g. from Storybook stories) without pulling in the entire app.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuHeading,
} from '@/components/atoms/dropdown-menu'
import { Button } from '@/components/atoms/button'
import {
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  BugAntIcon,
  ArrowPathIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/20/solid'
import { PlusIcon } from '@heroicons/react/16/solid'
import { useTheme } from '@/components/theme/ThemeProvider'
import { BUY_ME_A_COFFEE_URL, BuyMeACoffeeIcon } from '@/components/atoms/BuyMeACoffee'
import { useNav } from '../../nav/NavContext'
import { CalendarSplitButton } from '@/components/molecules/CalendarSplitButton'
import { playgroundDB } from '../../services/playgroundDB'
import type { NavItemL3 } from '../../nav/navTypes'
import { useAudio } from '@/components/audio/AudioContext'

// ── NewEntryButton ───────────────────────────────────────────────────────────

export function NewEntryButton() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const navigateToDate = (date: Date | null) => {
    if (!date) return
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    navigate(`/journal/${y}-${m}-${d}`)
  }

  return (
    <CalendarSplitButton
      primary={{
        id: 'new-entry',
        label: 'New',
        icon: PlusIcon,
        action: { type: 'call', handler: () => navigateToDate(new Date()) },
      }}
      selectedDate={selectedDate}
      onDateSelect={(date) => {
        setSelectedDate(date)
        navigateToDate(date)
      }}
      size="sm"
    />
  )
}


// ── ActionsMenu ──────────────────────────────────────────────────────────────

export function ActionsMenu({
  currentWorkout,
  onDownload,
  items,
}: {
  currentWorkout: { name: string; content: string }
  onDownload?: () => void
  items?: NavItemL3[]
}) {
  const { l3Items: contextL3, scrollToSection } = useNav()
  const { theme, setTheme } = useTheme()
  const { isEnabled: isAudioEnabled, toggleAudio } = useAudio()
  
  const l3Items = items || contextL3
  const [debugMode, setDebugMode] = useState(
    () => localStorage.getItem('debugMode') === 'true'
  )

  const handleToggleDebug = () => {
    const next = !debugMode
    setDebugMode(next)
    localStorage.setItem('debugMode', String(next))
  }

  const handleResetData = async () => {
    localStorage.clear()
    await playgroundDB.clearAll()
    window.location.reload()
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
      return
    }
    const blob = new Blob([currentWorkout.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = currentWorkout.name.replace(/[/\\:*?"<>|]/g, '-')
    a.download = `${safeName}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBuyMeACoffee = () => {
    window.open(BUY_ME_A_COFFEE_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <EllipsisVerticalIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {l3Items.length > 0 && (
          <>
            <div>
              <DropdownMenuHeading>On this page</DropdownMenuHeading>
              {l3Items.map(item => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="gap-2"
                >
                  <span className={cn('flex-1 truncate', item.level === 3 && item.secondaryAction && 'pr-8')}>
                    {item.label}
                  </span>
                  {item.secondaryAction && (
                    <button
                      className="ml-auto flex items-center justify-center size-5 rounded text-primary hover:bg-primary/10 transition-colors"
                      title={item.secondaryAction.label}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (item.secondaryAction?.action.type === 'call') {
                          item.secondaryAction.action.handler()
                        }
                      }}
                    >
                      {item.secondaryAction.icon && (
                        <item.secondaryAction.icon className="size-3.5" />
                      )}
                    </button>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={toggleAudio} className="gap-2">
          <span className="flex size-4 items-center justify-center">
            {isAudioEnabled ? <SpeakerWaveIcon className="size-4" /> : <SpeakerXMarkIcon className="size-4" />}
          </span>
          <span className="flex-1">Sound: {isAudioEnabled ? 'On' : 'Off'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
          className="gap-2"
        >
          <span className="flex size-4 items-center justify-center">
            {theme === 'light' && <SunIcon className="size-4" />}
            {theme === 'dark' && <MoonIcon className="size-4" />}
            {theme === 'system' && <ComputerDesktopIcon className="size-4" />}
          </span>
          <span className="flex-1">Theme: {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload} className="gap-2">
          <ArrowDownTrayIcon className="size-4" />
          <span className="flex-1">Download Markdown</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleBuyMeACoffee} className="gap-2">
          <BuyMeACoffeeIcon className="size-5" />
          <span className="flex-1">Buy Me a Coffee</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleToggleDebug} className="gap-2">
          <BugAntIcon className="size-4" />
          <span className="flex-1">Debug Mode</span>
          {debugMode && <span className="text-blue-500 text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleResetData} className="gap-2">
          <ArrowPathIcon className="size-4 text-red-500" />
          <span className="flex-1 text-red-500">Reset & Clear Cache</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
