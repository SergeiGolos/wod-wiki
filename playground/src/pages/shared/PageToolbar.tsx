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
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSection,
  DropdownHeading,
} from '@/components/playground/dropdown'
import {
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  BugAntIcon,
  ArrowPathIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/20/solid'
import { PlusIcon } from '@heroicons/react/16/solid'
import { useTheme } from '@/components/theme/ThemeProvider'
import { BUY_ME_A_COFFEE_URL, BuyMeACoffeeIcon } from '@/components/ui/BuyMeACoffee'
import { useNav } from '../../nav/NavContext'
import { CalendarSplitButton } from '@/components/ui/CalendarSplitButton'
import { playgroundDB } from '../../services/playgroundDB'
import type { NavItemL3 } from '../../nav/navTypes'

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

// ── ThemeSwitcher ────────────────────────────────────────────────────────────

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <Dropdown>
      <DropdownButton plain aria-label="Switch theme">
        {theme === 'light' && <SunIcon data-slot="icon" className="size-5 text-zinc-500" />}
        {theme === 'dark' && <MoonIcon data-slot="icon" className="size-5 text-zinc-500" />}
        {theme === 'system' && <ComputerDesktopIcon data-slot="icon" className="size-5 text-zinc-500" />}
      </DropdownButton>
      <DropdownMenu className="min-w-32" anchor="bottom end">
        <DropdownItem onClick={() => setTheme('light')}>
          <SunIcon data-slot="icon" />
          <DropdownLabel>Light</DropdownLabel>
          {theme === 'light' && <span className="col-start-5 text-blue-500">✓</span>}
        </DropdownItem>
        <DropdownItem onClick={() => setTheme('dark')}>
          <MoonIcon data-slot="icon" />
          <DropdownLabel>Dark</DropdownLabel>
          {theme === 'dark' && <span className="col-start-5 text-blue-500">✓</span>}
        </DropdownItem>
        <DropdownItem onClick={() => setTheme('system')}>
          <ComputerDesktopIcon data-slot="icon" />
          <DropdownLabel>System</DropdownLabel>
          {theme === 'system' && <span className="col-start-5 text-blue-500">✓</span>}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
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
    <Dropdown>
      <DropdownButton plain>
        <EllipsisVerticalIcon data-slot="icon" className="size-5 text-zinc-500" />
      </DropdownButton>
      <DropdownMenu className="min-w-56" anchor="bottom end">
        {l3Items.length > 0 && (
          <>
            <DropdownSection>
              <DropdownHeading>On this page</DropdownHeading>
              {l3Items.map(item => (
                <DropdownItem key={item.id} onClick={() => scrollToSection(item.id)}>
                  <DropdownLabel className={cn(item.level === 3 && item.secondaryAction && 'pr-8')}>
                    {item.label}
                  </DropdownLabel>
                  {item.secondaryAction && (
                    <button
                      className="col-start-5 flex items-center justify-center size-5 rounded text-primary hover:bg-primary/10 transition-colors"
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
                </DropdownItem>
              ))}
            </DropdownSection>
            <DropdownDivider />
          </>
        )}
        <DropdownItem onClick={handleDownload}>
          <ArrowDownTrayIcon data-slot="icon" />
          <DropdownLabel>Download Markdown</DropdownLabel>
        </DropdownItem>
        <DropdownItem onClick={handleBuyMeACoffee}>
          <BuyMeACoffeeIcon data-slot="icon" className="size-5" />
          <DropdownLabel>Buy Me a Coffee</DropdownLabel>
        </DropdownItem>
        <DropdownItem onClick={handleToggleDebug}>
          <BugAntIcon data-slot="icon" />
          <DropdownLabel>Debug Mode</DropdownLabel>
          {debugMode && <span className="col-start-5 text-blue-500">✓</span>}
        </DropdownItem>
        <DropdownDivider />
        <DropdownItem onClick={handleResetData}>
          <ArrowPathIcon data-slot="icon" className="text-red-500" />
          <DropdownLabel className="text-red-500">Reset &amp; Clear Cache</DropdownLabel>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
