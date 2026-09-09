/**
 * StickyGroupHeader — the shared sticky bucket header for grouped streams.
 *
 * Asserts the contract every grouped listing depends on:
 *   1. The header is sticky and positioned at the measured boundary offset
 *      (inline `top` — the one thing jsdom can observe without CSS).
 *   2. Label, icon, badge, and right-aligned meta render in one row.
 */
import { describe, expect, it } from 'bun:test'
import { render, screen, cleanup } from '@testing-library/react'

import { StickyGroupHeader } from './StickyGroupHeader'

describe('StickyGroupHeader', () => {
  it('positions itself at the measured sticky-boundary offset', () => {
    const { container } = render(
      <StickyGroupHeader top={61} label="Sep 6, 2026" />,
    )
    const header = container.firstElementChild as HTMLElement
    expect(header.style.top).toBe('61px')
    expect(header.className).toContain('sticky')
    expect(screen.getByText('Sep 6, 2026')).toBeTruthy()
    cleanup()
  })

  it('renders icon, badge, and right-aligned meta', () => {
    render(
      <StickyGroupHeader
        top={61}
        label="Today"
        icon={<svg data-testid="hdr-icon" />}
        badge={<span data-testid="hdr-badge">Today</span>}
        meta="2 entries"
      />,
    )
    expect(screen.getByTestId('hdr-icon')).toBeTruthy()
    expect(screen.getByTestId('hdr-badge')).toBeTruthy()
    expect(screen.getByText('2 entries')).toBeTruthy()
    cleanup()
  })
})
