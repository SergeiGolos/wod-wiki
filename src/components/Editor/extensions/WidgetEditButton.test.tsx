import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { WidgetEditButton, WIDGET_EDIT_BUTTON_LABELS } from './WidgetEditButton'

afterEach(() => {
  cleanup()
})

describe('WidgetEditButton', () => {
  it('renders the pencil icon and edit tooltip in view mode', () => {
    const { container } = render(
      <WidgetEditButton
        mode="view"
        enterEditMode={() => {}}
        onSave={() => {}}
        onUndo={() => {}}
      />,
    )

    const button = screen.getByRole('button', { name: /edit widget/i })
    expect(button.getAttribute('title')).toBe(WIDGET_EDIT_BUTTON_LABELS.view)
    expect(button.getAttribute('data-mode')).toBe('view')

    const pencilIcon = container.querySelector('[data-icon-state="view"]')
    const saveIcon = container.querySelector('[data-icon-state="editing"]')
    const undoIcon = container.querySelector('[data-icon-state="error"]')

    expect(pencilIcon?.getAttribute('class')).toContain('opacity-100')
    expect(saveIcon?.getAttribute('class')).toContain('opacity-0')
    expect(undoIcon?.getAttribute('class')).toContain('opacity-0')
  })

  it('renders the save icon and save tooltip in editing mode', () => {
    const { container } = render(
      <WidgetEditButton
        mode="editing"
        enterEditMode={() => {}}
        onSave={() => {}}
        onUndo={() => {}}
      />,
    )

    const button = screen.getByRole('button', { name: /save widget/i })
    expect(button.getAttribute('title')).toBe(WIDGET_EDIT_BUTTON_LABELS.editing)
    expect(button.className).toContain('text-emerald-600')

    const saveIcon = container.querySelector('[data-icon-state="editing"]')
    expect(saveIcon?.getAttribute('class')).toContain('opacity-100')
  })

  it('renders the undo icon and undo tooltip in error mode', () => {
    const { container } = render(
      <WidgetEditButton
        mode="error"
        enterEditMode={() => {}}
        onSave={() => {}}
        onUndo={() => {}}
      />,
    )

    const button = screen.getByRole('button', { name: /undo changes/i })
    expect(button.getAttribute('title')).toBe(WIDGET_EDIT_BUTTON_LABELS.error)
    expect(button.className).toContain('text-amber-600')

    const undoIcon = container.querySelector('[data-icon-state="error"]')
    expect(undoIcon?.getAttribute('class')).toContain('opacity-100')
  })

  it('keeps the button absolutely positioned with hover and transition styling', () => {
    render(
      <WidgetEditButton
        mode="view"
        enterEditMode={() => {}}
        onSave={() => {}}
        onUndo={() => {}}
      />,
    )

    const button = screen.getByRole('button', { name: /edit widget/i })
    expect(button.className).toContain('absolute')
    expect(button.className).toContain('right-2')
    expect(button.className).toContain('top-2')
    expect(button.className).toContain('hover:bg-muted/80')
    expect(button.className).toContain('cursor-pointer')
    expect(button.className).toContain('duration-200')
  })

  it('dispatches the matching click handler for each mode', () => {
    const enterEditMode = mock(() => {})
    const onSave = mock(() => {})
    const onUndo = mock(() => {})

    const { rerender } = render(
      <WidgetEditButton
        mode="view"
        enterEditMode={enterEditMode}
        onSave={onSave}
        onUndo={onUndo}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /edit widget/i }))
    expect(enterEditMode).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledTimes(0)
    expect(onUndo).toHaveBeenCalledTimes(0)

    rerender(
      <WidgetEditButton
        mode="editing"
        enterEditMode={enterEditMode}
        onSave={onSave}
        onUndo={onUndo}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /save widget/i }))
    expect(onSave).toHaveBeenCalledTimes(1)

    rerender(
      <WidgetEditButton
        mode="error"
        enterEditMode={enterEditMode}
        onSave={onSave}
        onUndo={onUndo}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /undo changes/i }))
    expect(onUndo).toHaveBeenCalledTimes(1)
  })
})
