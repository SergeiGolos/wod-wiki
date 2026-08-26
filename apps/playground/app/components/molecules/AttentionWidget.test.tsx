import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { AttentionWidget, type AttentionWidgetConfig } from './AttentionWidget'

const validConfig: AttentionWidgetConfig = {
  headline: 'Widget-driven playground',
  subtitle: 'Use widgets to frame workout content with clear calls-to-action.',
  pillars: [
    {
      icon: <span aria-hidden="true">⚡</span>,
      label: 'Attention widget',
      description: 'Hero framing and CTA emphasis.',
    },
  ],
  actions: [
    { label: 'Jump to workout', action: 'scroll-to-workout', variant: 'primary' },
    { label: 'Open search', action: 'open-search', variant: 'secondary' },
  ],
}

afterEach(() => {
  cleanup()
})

describe('AttentionWidget', () => {
  it('renders headline, pillars, and actions', () => {
    const onAction = () => {}

    render(<AttentionWidget config={validConfig} onAction={onAction} />)

    expect(screen.getByRole('heading', { name: /widget-driven playground/i })).toBeTruthy()
    expect(screen.getByText(/hero framing and cta emphasis/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /jump to workout/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /open search/i })).toBeTruthy()
  })

  it('dispatches configured action values on click', () => {
    const calls: string[] = []

    render(<AttentionWidget config={validConfig} onAction={(action) => calls.push(action)} />)

    fireEvent.click(screen.getByRole('button', { name: /jump to workout/i }))
    fireEvent.click(screen.getByRole('button', { name: /open search/i }))

    expect(calls).toEqual(['scroll-to-workout', 'open-search'])
  })

  it('shows an explicit invalid-config state', () => {
    render(
      <AttentionWidget
        config={{ headline: '', subtitle: '', pillars: [], actions: [] }}
        onAction={() => {}}
      />,
    )

    expect(screen.getByText(/invalid/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /jump to workout/i })).toBeNull()
  })
})
