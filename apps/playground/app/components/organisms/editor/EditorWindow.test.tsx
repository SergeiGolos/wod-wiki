import { describe, expect, it, mock, afterEach } from 'bun:test'
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ScriptBlock } from '@/components/Editor/types'
import { EditorWindow } from './EditorWindow'

// CM6 measures via the jsdom window, not globalThis — polyfill both.
;(window as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(cb, 0)
;(window as any).cancelAnimationFrame ??= (id: number) => clearTimeout(id)
const zeroRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }
;(window.Range.prototype as any).getClientRects ??= () => []
;(window.Range.prototype as any).getBoundingClientRect ??= () => zeroRect
;(window.Element.prototype as any).getClientRects ??= () => []

afterEach(() => cleanup())

describe('EditorWindow', () => {
  it('renders chrome title, subtitle, and subheader slot', () => {
    render(
      <EditorWindow
        title="protocols.md"
        subtitle="v1"
        doc="5:00 Run"
        onDocChange={() => {}}
        subheader={<div data-testid="custom-subheader">Breadcrumbs</div>}
      />,
    )

    expect(screen.getByText('protocols.md')).toBeDefined()
    expect(screen.getByText('· v1')).toBeDefined()
    expect(screen.getByTestId('custom-subheader')).toBeDefined()
    expect(screen.getByText('Breadcrumbs')).toBeDefined()
  })

  it('renders title-bar Run button and passes doc + parsed block on click', () => {
    const onRun = mock((_doc: string, _block: ScriptBlock | null) => {})
    const sampleDoc = '5:00 Run'

    render(
      <EditorWindow
        title="timers.md"
        doc={sampleDoc}
        onDocChange={() => {}}
        run={{ onRun, label: 'Run Workout' }}
      />,
    )

    const runButton = screen.getByRole('button', { name: /Run Workout/i })
    expect(runButton).toBeDefined()

    fireEvent.click(runButton)
    expect(onRun).toHaveBeenCalledTimes(1)
    expect(onRun.mock.calls[0][0]).toBe(sampleDoc)
  })

  it('renders children inside editor body', () => {
    render(
      <EditorWindow
        title="test.md"
        doc="content"
        onDocChange={() => {}}
      >
        <div data-testid="overlay-toast">Toast overlay</div>
      </EditorWindow>,
    )

    expect(screen.getByTestId('overlay-toast')).toBeDefined()
    expect(screen.getByText('Toast overlay')).toBeDefined()
  })

  it('forwards reset handler to chrome', () => {
    const onReset = mock(() => {})
    render(
      <EditorWindow
        title="test.md"
        doc="content"
        onDocChange={() => {}}
        onReset={onReset}
      />,
    )

    const resetButtons = screen.getAllByRole('button', { name: /Reset/i })
    expect(resetButtons.length).toBeGreaterThan(0)
    fireEvent.click(resetButtons[0])
    expect(onReset).toHaveBeenCalled()
  })
})
