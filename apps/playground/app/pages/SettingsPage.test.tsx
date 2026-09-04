import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SettingsPage } from './SettingsPage'

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
