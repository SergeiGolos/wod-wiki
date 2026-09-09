/**
 * SettingsPage — /settings, /settings/appearance, /settings/system
 *
 * Dedicated settings surface for Wod Wiki, replacing the header "…" dropdown
 * configuration options.
 *
 *   - /settings/appearance (default): Interface theme (System / Light / Dark),
 *     startup page (Home / Journal), and date language formatting
 *     (Auto / English / 中文 / Español / Deutsch / Français).
 *   - /settings/system: Audio feedback (sound effects & test chime), developer
 *     debug mode toggle, and "Reset & Clear Cache" danger zone.
 */

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Sun,
  Moon,
  Laptop,
  Home,
  BookOpen,
  Globe,
  Volume2,
  VolumeX,
  Bug,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  Check,
  Paintbrush,
  Sliders,
  Search,
  PanelRight,
  PanelLeft,
} from 'lucide-react'
import { StickyPageHeader } from '@/panels/page-shells/StickyPageHeader'
import { useTheme } from '@/contexts/ThemeProvider'
import { useAudio } from '@/contexts/AudioContext'
import { useDebugMode } from '@/contexts/DebugModeContext'
import { useFabAlignment, FAB_ALIGNMENT_OPTIONS } from '../lib/fabAlignment'
import { useDateLocale, DATE_LOCALE_OPTIONS, getDateLocale } from '../lib/dateLocale'
import { useStartPage, START_PAGE_OPTIONS } from '../lib/startPage'
import { readSeedStatus, runSeedSync, type SeedStatus } from '@/services/seed/seedSync'
import { toast } from '@/hooks/use-toast'
import { resetUserData } from '../services/resetUserData'
import { Switch } from '@/components/atoms/primitives/switch'
import { Button } from '@/components/atoms/primitives/button'
import { cn } from '@/lib/utils'

type SettingsTab = 'appearance' | 'system'

export function SettingsPage() {
  const location = useLocation()
  const navigate = useNavigate()

  // Determine active tab based on route; default to appearance
  const activeTab: SettingsTab = location.pathname.endsWith('/system') ? 'system' : 'appearance'

  const handleTabChange = (tab: SettingsTab) => {
    navigate(`/settings/${tab}`)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <StickyPageHeader
        title="Settings"
        subtitle="Manage appearance, regional formatting, audio, and system preferences"
      />

      {/* Subroute Navigation Tabs */}
      <div className="border-b border-border/50 bg-card/40 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('appearance')}
            data-testid="settings-tab-appearance"
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'appearance'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
          >
            <Paintbrush className="size-4" />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('system')}
            data-testid="settings-tab-system"
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'system'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
          >
            <Sliders className="size-4" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {activeTab === 'appearance' ? <AppearanceSection /> : <SystemSection />}
        </div>
      </main>
    </div>
  )
}

// ── Appearance Section ─────────────────────────────────────────────────────────

function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const [dateLocale, setDateLocale] = useDateLocale()
  const [fabAlignment, setFabAlignment] = useFabAlignment()
  const fabAlignmentIcons = { right: PanelRight, left: PanelLeft } as const
  const [startPage, setStartPage] = useStartPage()
  const startPageIcons = { home: Home, journal: BookOpen } as const

  const today = useMemo(() => new Date(), [])

  const themeOptions = [
    {
      id: 'system' as const,
      label: 'System',
      description: 'Follows your operating system color scheme preferences',
      icon: Laptop,
      isDefault: true,
    },
    {
      id: 'light' as const,
      label: 'Light',
      description: 'Crisp light background with dark text for high daytime readability',
      icon: Sun,
    },
    {
      id: 'dark' as const,
      label: 'Dark',
      description: 'Relaxed dark background for lower eye strain in low-light settings',
      icon: Moon,
    },
  ]

  const formatPreviewDate = (tag: string | null): string => {
    const localeToUse = tag || getDateLocale()
    try {
      return today.toLocaleDateString(localeToUse, {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return today.toDateString()
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Interface Theme */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Interface Theme</h2>
          <p className="text-sm text-muted-foreground">
            Select your preferred color theme. Changes are saved and applied immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {themeOptions.map(option => {
            const isSelected = theme === option.id
            const Icon = option.icon

            return (
              <button
                key={option.id}
                type="button"
                data-testid={`theme-option-${option.id}`}
                onClick={() => setTheme(option.id)}
                className={cn(
                  'relative flex flex-col items-start p-4 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-foreground shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40',
                )}
              >
                <div className="w-full flex items-center justify-between mb-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {option.isDefault && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Default
                      </span>
                    )}
                    <div
                      className={cn(
                        'size-4 rounded-full border flex items-center justify-center transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40',
                      )}
                    >
                      {isSelected && <Check className="size-2.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>

                <div className="font-semibold text-foreground text-sm">{option.label}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {option.description}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 2. Date Language */}
      <section className="space-y-4 pt-4 border-t border-border/50">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            Date & Calendar Language
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure the language used for date headers, journal entries, and calendar widgets.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DATE_LOCALE_OPTIONS.map(option => {
            const isSelected = dateLocale === option.tag
            const preview = formatPreviewDate(option.tag)

            return (
              <div
                key={option.tag ?? 'auto'}
                data-testid={`date-locale-${option.tag ?? 'auto'}`}
                onClick={() => setDateLocale(option.tag)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setDateLocale(option.tag)
                  }
                }}
                className={cn(
                  'flex items-center justify-between p-3.5 rounded-xl border text-left cursor-pointer transition-all',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-foreground shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40',
                )}
              >
                <div className="space-y-0.5 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{option.label}</span>
                    {option.tag === null && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    Sample: {preview}
                  </div>
                </div>

                <div
                  className={cn(
                    'size-4 shrink-0 rounded-full border flex items-center justify-center transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/40',
                  )}
                >
                  {isSelected && <span className="text-[10px] font-bold">✓</span>}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 3. Actions Button Position */}
      <section className="space-y-4 pt-4 border-t border-border/50">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Search className="size-4 text-primary" />
            Actions Button Position
          </h2>
          <p className="text-sm text-muted-foreground">
            On phones, search and page actions float as a button cluster at the bottom of the
            screen. Place the cluster near your dominant thumb.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {FAB_ALIGNMENT_OPTIONS.map(option => {
            const isSelected = fabAlignment === option.id
            const Icon = fabAlignmentIcons[option.id]

            return (
              <button
                key={option.id}
                type="button"
                data-testid={`fab-alignment-${option.id}`}
                onClick={() => setFabAlignment(option.id)}
                className={cn(
                  'relative flex flex-col items-start p-4 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-foreground shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40',
                )}
              >
                <div className="w-full flex items-center justify-between mb-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {option.id === 'right' && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Default
                      </span>
                    )}
                    <div
                      className={cn(
                        'size-4 rounded-full border flex items-center justify-center transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40',
                      )}
                    >
                      {isSelected && <Check className="size-2.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>

                <div className="font-semibold text-foreground text-sm">{option.label}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {option.description}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 4. Startup Page */}
      <section className="space-y-4 pt-4 border-t border-border/50">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Home className="size-4 text-primary" />
            Startup Page
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose which page Wod Wiki opens on. The other page stays reachable
            from the navigation either way.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {START_PAGE_OPTIONS.map(option => {
            const isSelected = startPage === option.id
            const Icon = startPageIcons[option.id]

            return (
              <button
                key={option.id}
                type="button"
                data-testid={`start-page-${option.id}`}
                aria-pressed={isSelected}
                onClick={() => setStartPage(option.id)}
                className={cn(
                  'relative flex flex-col items-start p-4 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-foreground shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40',
                )}
              >
                <div className="w-full flex items-center justify-between mb-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {option.id === 'home' && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Default
                      </span>
                    )}
                    <div
                      className={cn(
                        'size-4 rounded-full border flex items-center justify-center transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40',
                      )}
                    >
                      {isSelected && <Check className="size-2.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>

                <div className="font-semibold text-foreground text-sm">{option.label}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {option.description}
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ── System Section ────────────────────────────────────────────────────────────

function SystemSection() {
  const { isEnabled: isAudioEnabled, toggleAudio, playTestSound } = useAudio()
  const { isDebugMode, toggleDebugMode } = useDebugMode()
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isResetConfirmOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsResetConfirmOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isResetConfirmOpen])

  const handleConfirmReset = async () => {
    setIsResetting(true)
    try {
      await resetUserData()
    } finally {
      window.location.reload()
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Audio Feedback */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            {isAudioEnabled ? (
              <Volume2 className="size-4 text-primary" />
            ) : (
              <VolumeX className="size-4 text-muted-foreground" />
            )}
            Audio Feedback
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure sound effects for workout timers, interval countdowns, and completion cues.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <label htmlFor="sound-switch" className="text-sm font-medium text-foreground cursor-pointer">
                Workout Sound Effects
              </label>
              <p className="text-xs text-muted-foreground">
                Play countdown beeps, interval alerts, and workout finish chimes
              </p>
            </div>
            <Switch
              id="sound-switch"
              data-testid="sound-toggle"
              checked={isAudioEnabled}
              onChange={toggleAudio}
            />
          </div>

          <div className="pt-3 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Test audio output device</span>
            <Button
              variant="outline"
              size="sm"
              onClick={playTestSound}
              disabled={!isAudioEnabled}
              data-testid="play-test-sound-btn"
              className="gap-2"
            >
              <Volume2 className="size-3.5" />
              <span>Play Test Chime</span>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Developer & Diagnostics */}
      <section className="space-y-4 pt-4 border-t border-border/50">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Bug className="size-4 text-primary" />
            Developer Diagnostics
          </h2>
          <p className="text-sm text-muted-foreground">
            Logging and runtime inspection tools for Whiteboard scripts and execution trees.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <label htmlFor="debug-switch" className="text-sm font-medium text-foreground cursor-pointer">
                Debug Mode
              </label>
              <p className="text-xs text-muted-foreground">
                Output verbose AST compilation and runtime execution traces to browser console
              </p>
            </div>
            <Switch
              id="debug-switch"
              data-testid="debug-mode-toggle"
              checked={isDebugMode}
              onChange={toggleDebugMode}
            />
          </div>
        </div>
      </section>

      {/* 3. Bundled Content (Seed) */}
      <SeedSyncCard />

      {/* 4. Data & Storage / Danger Zone */}
      <section className="space-y-4 pt-4 border-t border-border/50">
        <div>
          <h2 className="text-base font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            Data & Cache (Danger Zone)
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your local database storage and reset client state.
          </p>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5 space-y-4">
          <div className="space-y-1">
            <div className="font-semibold text-sm text-foreground">Reset & Clear Cache</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Wipes all durable data stores including IndexedDB (notes, workouts, custom efforts,
              recorded results, and attachments) and resets all localStorage preferences. The application
              will return to a fresh first-run state — bundled content (workouts, guides, collections,
              dashboards) re-imports automatically on the next launch.
            </p>
          </div>

          <div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsResetConfirmOpen(true)}
              data-testid="reset-cache-button"
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              <span>Reset & Clear Cache</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Confirmation Modal */}
      {isResetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget && !isResetting) setIsResetConfirmOpen(false)
          }}
          data-testid="reset-confirmation-modal"
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl flex flex-col gap-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
          >
            <div className="flex items-center gap-2.5 text-destructive font-semibold text-base" id="reset-modal-title">
              <AlertTriangle className="size-5" />
              Reset All Application Data?
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This action will permanently wipe every note, result, cached effort, and local setting
              from your browser storage. This returns Wod Wiki to its first-run state and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReset}
                disabled={isResetting}
                data-testid="confirm-reset-button"
                className="gap-2"
              >
                {isResetting ? (
                  <span>Resetting…</span>
                ) : (
                  <>
                    <RotateCcw className="size-4" />
                    <span>Yes, Reset Everything</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bundled Content (Seed) ────────────────────────────────────────────────────

const formatSeedVersion = (version: number): string =>
  new Date(version).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/**
 * SeedSyncCard — bundled-content (seed) status + manual re-sync for
 * /settings/system. The seed is the only path bundled content (canvas pages,
 * syntax guides, collections, feeds, dashboards, efforts, page template)
 * takes into IndexedDB; re-syncing re-applies every published chunk with the
 * ownership rules (user edits always win).
 */
function SeedSyncCard() {
  const [status, setStatus] = useState<SeedStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setStatus(await readSeedStatus())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleResync = useCallback(async () => {
    setIsSyncing(true)
    try {
      const outcome = await runSeedSync({ force: true })
      if (outcome === 'imported') {
        toast({ title: 'Bundled content re-synced', description: 'Workouts, guides, collections, and dashboards were restored from the published seed. Your own edits were kept.' })
      } else if (outcome === 'error') {
        toast({ title: 'Re-sync failed', description: 'Check your connection and the browser console for details.', variant: 'destructive' })
      } else if (outcome === 'busy') {
        toast({ title: 'Another tab is already syncing', description: 'Wait for it to finish, then try again.' })
      } else {
        toast({ title: `Nothing to import (${outcome})` })
      }
      await refresh()
    } finally {
      setIsSyncing(false)
    }
  }, [refresh])

  const upToDate = status?.stored != null && status.remote != null && status.stored.version === status.remote.version

  return (
    <section className="space-y-4 pt-4 border-t border-border/50">
      <div>
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <CloudDownload className="size-4 text-primary" />
          Bundled Content
        </h2>
        <p className="text-sm text-muted-foreground">
          Workouts, guides, collections, and dashboards bundled with the app are stored locally and
          re-imported automatically when a new version is published.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="grid gap-2 text-sm" data-testid="seed-status-card">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Local database</span>
            <span className="font-medium text-foreground" data-testid="seed-local-version">
              {isLoading
                ? 'Checking…'
                : status?.stored
                  ? `v${status.stored.version} · schema ${status.stored.schema} · imported ${formatSeedVersion(status.stored.importedAt)}`
                  : 'Not imported yet'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Published version</span>
            <span className="font-medium text-foreground flex items-center gap-1.5" data-testid="seed-remote-version">
              {isLoading
                ? 'Checking…'
                : status?.remote
                  ? `v${status.remote.version} · schema ${status.remote.schema}`
                  : status?.remoteError
                    ? (
                        <>
                          <AlertCircle className="size-3.5 text-muted-foreground" />
                          Unavailable
                        </>
                      )
                    : 'Checking…'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Status</span>
            <span
              className="font-medium flex items-center gap-1.5"
              data-testid="seed-sync-status"
            >
              {isLoading ? (
                'Checking…'
              ) : upToDate ? (
                <>
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  Up to date
                </>
              ) : status?.remote == null ? (
                'Unknown (remote unreachable)'
              ) : (
                'Update available — re-imports automatically on next launch'
              )}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Re-applies every published chunk. Your own notes, results, and edits are never overwritten.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResync}
            disabled={isSyncing || isLoading}
            data-testid="seed-resync-button"
            className="gap-2"
          >
            {isSyncing ? <RefreshCw className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            <span>{isSyncing ? 'Re-syncing…' : 'Re-sync Now'}</span>
          </Button>
        </div>
      </div>
    </section>
  )
}
