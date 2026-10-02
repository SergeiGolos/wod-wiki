import { describe, it, expect, mock, afterEach } from 'bun:test'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { writeRouteWqlConfig, clearRouteWqlConfig } from '../../lib/routeWqlConfig'
import { ViewSettingsDialog } from './ViewSettingsDialog'
import type { ViewSettings } from '../../lib/viewSettingsStorage'

afterEach(() => {
  cleanup()
})

describe('ViewSettingsDialog component', () => {
  const defaultSettings: ViewSettings = {
    level: 'effort',
    layout: 'cards',
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
    expect(screen.getByTestId('view-settings-layout-cards')).toBeDefined()
    expect(screen.getByTestId('view-settings-layout-rows')).toBeDefined()
    expect(screen.getByTestId('view-settings-layout-feed')).toBeDefined()
  })

  it('allows switching layout between cards, rows, and feed', () => {
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

    fireEvent.click(screen.getByTestId('view-settings-layout-rows'))
    expect(handleLayoutChange).toHaveBeenCalledWith('rows')

    fireEvent.click(screen.getByTestId('view-settings-layout-feed'))
    expect(handleLayoutChange).toHaveBeenCalledWith('feed')
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
        settings={{ ...defaultSettings, layout: 'rows', visibleFields: ['label'] }}
        onLayoutChange={mock()}
        onToggleField={mock()}
        onReset={handleReset}
      />,
    )

    const resetButton = screen.getByTestId('view-settings-reset')
    fireEvent.click(resetButton)

    expect(handleReset).toHaveBeenCalledTimes(1)
  })

  it('offers the system Group-By list when the route has no WQL config', () => {
    render(
      <ViewSettingsDialog
        open={true}
        onOpenChange={mock()}
        route="/efforts"
        level="effort"
        settings={defaultSettings}
        onLayoutChange={mock()}
        onGroupByChange={mock()}
        onToggleField={mock()}
        onReset={mock()}
      />,
    )

    expect(screen.getByTestId('view-settings-group-date')).toBeDefined()
    expect(screen.getByTestId('view-settings-group-discipline')).toBeDefined()
    expect(screen.getByTestId('view-settings-group-source')).toBeDefined()
  })

  it('renders the configured Group-By options instead of the system list', () => {
    writeRouteWqlConfig('/efforts', { groupByOptions: ['week', 'discipline'] })
    try {
      render(
        <ViewSettingsDialog
          open={true}
          onOpenChange={mock()}
          route="/efforts"
          level="effort"
          settings={defaultSettings}
          onLayoutChange={mock()}
          onGroupByChange={mock()}
          onToggleField={mock()}
          onReset={mock()}
        />,
      )

      expect(screen.getByTestId('view-settings-group-week')).toBeDefined()
      expect(screen.getByTestId('view-settings-group-discipline')).toBeDefined()
      expect(screen.queryByTestId('view-settings-group-source')).toBeNull()
    } finally {
      clearRouteWqlConfig('/efforts')
    }
  })

  it('labels the fallback arrangement "Arrange cards by" and selects the active fallback', () => {
    render(
      <ViewSettingsDialog
        open={true}
        onOpenChange={mock()}
        route="/efforts"
        level="effort"
        settings={defaultSettings}
        activeGroupBy="week"
        onLayoutChange={mock()}
        onGroupByChange={mock()}
        onToggleField={mock()}
        onReset={mock()}
      />,
    )

    expect(screen.getByText('Arrange cards by')).toBeDefined()
    const week = screen.getByTestId('view-settings-group-week') as HTMLButtonElement
    expect(week.disabled).toBe(false)
    expect(week.getAttribute('aria-pressed')).toBe('true')
  })

  it('shows "Controlled by query", disables fallback buttons, and selects none while the query owns grouping', () => {
    const handleGroupByChange = mock()
    render(
      <ViewSettingsDialog
        open={true}
        onOpenChange={mock()}
        route="/efforts"
        level="effort"
        settings={{ ...defaultSettings, groupBy: 'week' }}
        activeGroupBy="effort"
        queryGrouping={['effort', 'discipline']}
        onLayoutChange={mock()}
        onGroupByChange={handleGroupByChange}
        onToggleField={mock()}
        onReset={mock()}
      />,
    )

    expect(screen.getByTestId('view-settings-query-grouped').textContent).toContain('effort, discipline')
    // The saved fallback (week) must not appear selected while WQL overrides it.
    expect((screen.getByTestId('view-settings-group-week') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('false')

    for (const id of ['date', 'week', 'month', 'year', 'discipline', 'tag', 'source']) {
      expect((screen.getByTestId(`view-settings-group-${id}`) as HTMLButtonElement).disabled).toBe(true)
    }

    fireEvent.click(screen.getByTestId('view-settings-group-week'))
    expect(handleGroupByChange).not.toHaveBeenCalled()
  })

  it('calls onEditQuery from the Controlled-by-query notice', () => {
    const handleEditQuery = mock()
    render(
      <ViewSettingsDialog
        open={true}
        onOpenChange={mock()}
        route="/efforts"
        level="effort"
        settings={defaultSettings}
        queryGrouping={['effort']}
        onEditQuery={handleEditQuery}
        onLayoutChange={mock()}
        onGroupByChange={mock()}
        onToggleField={mock()}
        onReset={mock()}
      />,
    )

    fireEvent.click(screen.getByTestId('view-settings-edit-query'))
    expect(handleEditQuery).toHaveBeenCalledTimes(1)
  })

  it('re-enables fallback grouping when the query grouping is removed', () => {
    const handleGroupByChange = mock()
    const { rerender } = render(
      <ViewSettingsDialog
        open={true}
        onOpenChange={mock()}
        route="/efforts"
        level="effort"
        settings={defaultSettings}
        activeGroupBy="effort"
        queryGrouping={['effort']}
        onLayoutChange={mock()}
        onGroupByChange={handleGroupByChange}
        onToggleField={mock()}
        onReset={mock()}
      />,
    )
    expect((screen.getByTestId('view-settings-group-discipline') as HTMLButtonElement).disabled).toBe(true)

    // Clearing the query grouping reveals the saved fallback again.
    rerender(
      <ViewSettingsDialog
        open={true}
        onOpenChange={mock()}
        route="/efforts"
        level="effort"
        settings={defaultSettings}
        activeGroupBy="discipline"
        queryGrouping={null}
        onLayoutChange={mock()}
        onGroupByChange={handleGroupByChange}
        onToggleField={mock()}
        onReset={mock()}
      />,
    )
    const discipline = screen.getByTestId('view-settings-group-discipline') as HTMLButtonElement
    expect(discipline.disabled).toBe(false)
    expect(discipline.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(discipline)
    expect(handleGroupByChange).toHaveBeenCalledWith('discipline')
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

    const closeBtn = screen.getByRole('button', { name: 'Close', exact: true })
    fireEvent.click(closeBtn)

    expect(handleOpenChange).toHaveBeenCalledWith(false)
  })
})
