import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SettingsPage } from './SettingsPage'
import { writeRouteWqlConfig, readRouteWqlConfig, clearRouteWqlConfig } from '../lib/routeWqlConfig'

// Mock contexts
let currentTheme = 'system'
const mockSetTheme = mock((t: string) => {
  currentTheme = t
})

mock.module('@/contexts/ThemeProvider', () => ({
  useTheme: () => ({
    theme: currentTheme,
    setTheme: mockSetTheme,
  }),
}))

let isAudioEnabled = true
const mockToggleAudio = mock(() => {
  isAudioEnabled = !isAudioEnabled
})
const mockPlayTestSound = mock(() => {})

mock.module('@/contexts/AudioContext', () => ({
  useAudio: () => ({
    isEnabled: isAudioEnabled,
    toggleAudio: mockToggleAudio,
    playTestSound: mockPlayTestSound,
  }),
}))

let isDebugMode = false
const mockToggleDebugMode = mock(() => {
  isDebugMode = !isDebugMode
})

mock.module('@/contexts/DebugModeContext', () => ({
  useDebugMode: () => ({
    isDebugMode,
    toggleDebugMode: mockToggleDebugMode,
  }),
}))

function renderSettings(initialPath = '/settings/appearance') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/:tab" element={<SettingsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    currentTheme = 'system'
    isAudioEnabled = true
    isDebugMode = false
    mockSetTheme.mockClear()
    mockToggleAudio.mockClear()
    mockPlayTestSound.mockClear()
    mockToggleDebugMode.mockClear()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  describe('Appearance Subroute', () => {
    it('renders the Appearance tab active by default and displays theme & date language options', () => {
      renderSettings('/settings/appearance')

      expect(screen.getByText('Settings')).toBeDefined()
      expect(screen.getByTestId('settings-tab-appearance')).toBeDefined()
      expect(screen.getByTestId('settings-tab-system')).toBeDefined()

      // Interface Theme section
      expect(screen.getByText('Interface Theme')).toBeDefined()
      expect(screen.getByTestId('theme-option-system')).toBeDefined()
      expect(screen.getByTestId('theme-option-light')).toBeDefined()
      expect(screen.getByTestId('theme-option-dark')).toBeDefined()

      // Date Language section
      expect(screen.getByText('Date & Calendar Language')).toBeDefined()
      expect(screen.getByTestId('date-locale-auto')).toBeDefined()
      expect(screen.getByTestId('date-locale-en')).toBeDefined()
      expect(screen.getByTestId('date-locale-zh')).toBeDefined()
    })

    it('changes theme when a theme card is clicked', () => {
      renderSettings('/settings/appearance')

      act(() => {
        screen.getByTestId('theme-option-dark').click()
      })
      expect(mockSetTheme).toHaveBeenCalledWith('dark')

      act(() => {
        screen.getByTestId('theme-option-light').click()
      })
      expect(mockSetTheme).toHaveBeenCalledWith('light')
    })

    it('offers Date language options with the current one marked, and persists a pick', () => {
      renderSettings('/settings/appearance')

      // Auto (UI language) is the default and carries the ✓.
      expect(screen.getByTestId('date-locale-auto').textContent).toContain('Auto (UI language)')
      expect(screen.getByTestId('date-locale-auto').textContent).toContain('✓')
      expect(screen.getByTestId('date-locale-en').textContent).not.toContain('✓')

      act(() => {
        screen.getByTestId('date-locale-en').click()
      })
      expect(localStorage.getItem('wodwiki:dateLocale')).toBe('en')

      // Re-render to observe state update
      cleanup()
      renderSettings('/settings/appearance')

      expect(screen.getByTestId('date-locale-en').textContent).toContain('✓')
      expect(screen.getByTestId('date-locale-auto').textContent).not.toContain('✓')

      // Switch back to Auto clears the stored override
      act(() => {
        screen.getByTestId('date-locale-auto').click()
      })
      expect(localStorage.getItem('wodwiki:dateLocale')).toBeNull()
    })

    it('offers Startup Page options with Home default, and persists a Journal pick', () => {
      renderSettings('/settings/appearance')

      // Home is the default (unset preference) and renders selected.
      expect(screen.getByText('Startup Page')).toBeDefined()
      expect(screen.getByTestId('start-page-home').getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByTestId('start-page-journal').getAttribute('aria-pressed')).toBe('false')

      act(() => {
        screen.getByTestId('start-page-journal').click()
      })
      expect(localStorage.getItem('wodwiki:startPage')).toBe('journal')

      // Re-render to observe state update
      cleanup()
      renderSettings('/settings/appearance')

      expect(screen.getByTestId('start-page-journal').getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByTestId('start-page-home').getAttribute('aria-pressed')).toBe('false')

      // Switching back to Home clears the stored override
      act(() => {
        screen.getByTestId('start-page-home').click()
      })
      expect(localStorage.getItem('wodwiki:startPage')).toBeNull()
    })
  })

  describe('System Subroute', () => {
    it('renders the System tab with Audio, Debug, and Danger Zone controls', () => {
      renderSettings('/settings/system')

      expect(screen.getByText('Audio Feedback')).toBeDefined()
      expect(screen.getByTestId('sound-toggle')).toBeDefined()
      expect(screen.getByTestId('play-test-sound-btn')).toBeDefined()

      expect(screen.getByText('Developer Diagnostics')).toBeDefined()
      expect(screen.getByTestId('debug-mode-toggle')).toBeDefined()

      expect(screen.getByText('Data & Cache (Danger Zone)')).toBeDefined()
      expect(screen.getByTestId('reset-cache-button')).toBeDefined()
    })

    it('toggles audio feedback switch and plays test chime', () => {
      renderSettings('/settings/system')

      act(() => {
        screen.getByTestId('sound-toggle').click()
      })
      expect(mockToggleAudio).toHaveBeenCalled()

      act(() => {
        screen.getByTestId('play-test-sound-btn').click()
      })
      expect(mockPlayTestSound).toHaveBeenCalled()
    })

    it('toggles developer debug mode switch', () => {
      renderSettings('/settings/system')

      act(() => {
        screen.getByTestId('debug-mode-toggle').click()
      })
      expect(mockToggleDebugMode).toHaveBeenCalled()
    })

    it('opens confirmation modal when clicking Reset & Clear Cache', () => {
      renderSettings('/settings/system')

      act(() => {
        screen.getByTestId('reset-cache-button').click()
      })

      expect(screen.getByText('Reset All Application Data?')).toBeDefined()
      expect(screen.getByText('Cancel')).toBeDefined()
      expect(screen.getByTestId('confirm-reset-button')).toBeDefined()

      // Cancel closes the dialog
      act(() => {
        screen.getByText('Cancel').click()
      })
      expect(screen.queryByText('Reset All Application Data?')).toBeNull()
    })
  })

  describe('Tab Navigation', () => {
    it('switches between Appearance and System tabs', () => {
      renderSettings('/settings/appearance')

      expect(screen.getByText('Interface Theme')).toBeDefined()

      act(() => {
        screen.getByTestId('settings-tab-system').click()
      })

      expect(screen.getByText('Audio Feedback')).toBeDefined()

      act(() => {
        screen.getByTestId('settings-tab-appearance').click()
      })

      expect(screen.getByText('Interface Theme')).toBeDefined()
    })
  })
})

describe('SettingsPage — Query Defaults tab', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders the tab and one card per configurable surface', () => {
    renderSettings('/settings/queries')

    expect(screen.getByTestId('settings-tab-queries')).toBeDefined()
    expect(screen.getByTestId('query-defaults-section')).toBeDefined()
    for (const id of ['/library', '/journal', '/collections', '/feeds', '/efforts', '/sessions', '/playgrounds', '/palette']) {
      expect(screen.getByTestId(`query-defaults-card-${id}`)).toBeDefined()
    }
  })

  it('saves a landing default query override into routeWqlConfig storage', () => {
    renderSettings('/settings/queries')

    fireEvent.change(screen.getByTestId('query-defaults-wql-/journal'), {
      target: { value: 'find:note{source:journal} last 52w' },
    })
    fireEvent.click(screen.getByTestId('query-defaults-save-/journal'))
    expect(screen.queryByTestId('query-defaults-wql-error-/journal')).toBeNull()
    expect(readRouteWqlConfig('/journal').defaultWql).toBe('find:note{source:journal} last 52w')
    // Saved state is no longer dirty — save disables.
    expect((screen.getByTestId('query-defaults-save-/journal') as HTMLButtonElement).disabled).toBe(true)
  })

  it('blocks saving an unparseable default query', () => {
    renderSettings('/settings/queries')

    fireEvent.change(screen.getByTestId('query-defaults-wql-/journal'), {
      target: { value: 'find:note{' },
    })
    expect(screen.getByTestId('query-defaults-wql-error-/journal')).toBeDefined()
    expect((screen.getByTestId('query-defaults-save-/journal') as HTMLButtonElement).disabled).toBe(true)
  })

  it('reset discards the stored override and returns to the system default', () => {
    writeRouteWqlConfig('/journal', { defaultWql: 'find:note last 6w' })
    renderSettings('/settings/queries')

    fireEvent.click(screen.getByTestId('query-defaults-reset-/journal'))

    expect(readRouteWqlConfig('/journal')).toEqual({})
    expect((screen.getByTestId('query-defaults-wql-/journal') as HTMLTextAreaElement).value).toBe('')
  })

  it('persists custom source options, including the emptied nudge state', () => {
    writeRouteWqlConfig('/library', { typeOptions: ['notes', 'journal'] })
    renderSettings('/settings/queries')

    fireEvent.click(screen.getByTestId('query-defaults-type-/library-remove-notes'))
    fireEvent.click(screen.getByTestId('query-defaults-type-/library-remove-journal'))
    expect(screen.getByTestId('query-defaults-type-empty-/library')).toBeDefined()
    fireEvent.click(screen.getByTestId('query-defaults-save-/library'))

    expect(readRouteWqlConfig('/library').typeOptions).toEqual([])
  })

  it('adds a source option via the list editor and persists it', () => {
    renderSettings('/settings/queries')

    fireEvent.click(screen.getByTestId('query-defaults-type-custom-/library'))
    fireEvent.change(screen.getByTestId('query-defaults-type-/library-input'), {
      target: { value: 'feeds' },
    })
    fireEvent.click(screen.getByTestId('query-defaults-type-/library-add'))
    fireEvent.click(screen.getByTestId('query-defaults-save-/library'))

    expect(readRouteWqlConfig('/library').typeOptions).toEqual(['feeds'])
  })
})
