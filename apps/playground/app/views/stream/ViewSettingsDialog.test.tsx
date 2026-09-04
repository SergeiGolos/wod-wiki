import { describe, it, expect, mock, afterEach } from 'bun:test'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ViewSettingsDialog } from './ViewSettingsDialog'
import type { ViewSettings } from '../../lib/viewSettingsStorage'

afterEach(() => {
  cleanup()
})

describe('ViewSettingsDialog component', () => {
  const defaultSettings: ViewSettings = {
    level: 'effort',
    layout: 'stream',
    visibleFields: ['label', 'canonicalSlug', 'discipline', 'met', 'intensityTier', 'aliases'],
  }

  it('renders nothing when open is false', () => {
    render(
      <ViewSettingsDialog
        open={false}
        onOpenChange={mock()}
        route="/efforts"
        level="effort"
        settings={defaultSettings}
        onLayoutChange={mock()}
        onToggleField={mock()}
        onReset={mock()}
      />,
    )

    expect(screen.queryByTestId('view-settings-dialog')).toBeNull()
  })

  it('renders dialog content when open is true', () => {
    render(
      <ViewSettingsDialog
        open={true}
        onOpenChange={mock()}
        route="/efforts"
        level="effort"
        settings={defaultSettings}
        onLayoutChange={mock()}
        onToggleField={mock()}
        onReset={mock()}
      />,
    )

    expect(screen.getByTestId('view-settings-dialog')).toBeDefined()
    expect(screen.getByText('View Settings')).toBeDefined()
    expect(screen.getByTestId('view-settings-layout-stream')).toBeDefined()
    expect(screen.getByTestId('view-settings-layout-table')).toBeDefined()
  })

  it('allows switching layout between stream and table', () => {
    const handleLayoutChange = mock()
    render(
      <ViewSettingsDialog
        open={true}
        onOpenChange={mock()}
        route="/efforts"
        level="effort"
        settings={defaultSettings}
        onLayoutChange={handleLayoutChange}
        onToggleField={mock()}
        onReset={mock()}
      />,
    )

    const tableButton = screen.getByTestId('view-settings-layout-table')
    fireEvent.click(tableButton)

    expect(handleLayoutChange).toHaveBeenCalledWith('table')
  })

  it('renders checkboxes for all available fields of the entity level', () => {
    render(
      <ViewSettingsDialog
        open={true}
        onOpenChange={mock()}
        route="/efforts"
        level="effort"
        settings={defaultSettings}
        onLayoutChange={mock()}
        onToggleField={mock()}
        onReset={mock()}
      />,
    )

    expect(screen.getByTestId('view-settings-field-label')).toBeDefined()
    expect(screen.getByTestId('view-settings-field-canonicalSlug')).toBeDefined()
    expect(screen.getByTestId('view-settings-field-discipline')).toBeDefined()
    expect(screen.getByTestId('view-settings-field-met')).toBeDefined()
    expect(screen.getByTestId('view-settings-field-intensityTier')).toBeDefined()
    expect(screen.getByTestId('view-settings-field-aliases')).toBeDefined()
  })

  it('calls onToggleField when a field checkbox is clicked', () => {
    const handleToggle = mock()
    render(
      <ViewSettingsDialog
        open={true}
        onOpenChange={mock()}
        route="/efforts"
        level="effort"
        settings={defaultSettings}
        onLayoutChange={mock()}
        onToggleField={handleToggle}
        onReset={mock()}
      />,
    )

    const metCheckbox = screen.getByTestId('view-settings-field-met')
    fireEvent.click(metCheckbox)

    expect(handleToggle).toHaveBeenCalledWith('met')
  })

  it('calls onReset when Reset to defaults is clicked', () => {
    const handleReset = mock()
    render(
      <ViewSettingsDialog
        open={true}
        onOpenChange={mock()}
        route="/efforts"
        level="effort"
        settings={{ ...defaultSettings, layout: 'table', visibleFields: ['label'] }}
        onLayoutChange={mock()}
        onToggleField={mock()}
        onReset={handleReset}
      />,
    )

    const resetButton = screen.getByTestId('view-settings-reset')
    fireEvent.click(resetButton)

    expect(handleReset).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenChange(false) when close button is clicked', () => {
    const handleOpenChange = mock()
    render(
      <ViewSettingsDialog
        open={true}
        onOpenChange={handleOpenChange}
        route="/efforts"
        level="effort"
        settings={defaultSettings}
        onLayoutChange={mock()}
        onToggleField={mock()}
        onReset={mock()}
      />,
    )

    const closeBtn = screen.getByTestId('view-settings-close-x')
    fireEvent.click(closeBtn)

    expect(handleOpenChange).toHaveBeenCalledWith(false)
  })
})
