import { describe, it, expect, beforeEach } from 'bun:test'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { DocumentTitleSync } from './DocumentTitleSync'

function NavigateButton({ to, children }: { to: string; children: string }) {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(to)}>
      {children}
    </button>
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]} initialIndex={0}>
      <DocumentTitleSync />
      <NavigateButton to="/journal/2026-01-01">Go Journal</NavigateButton>
      <NavigateButton to="/effort/push-up">Go Effort</NavigateButton>
      <NavigateButton to="/playground/abc">Go Playground</NavigateButton>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  cleanup()
  document.title = 'Test Setup Title'
})

describe('DocumentTitleSync', () => {
  it('sets the default title for unmapped routes', () => {
    renderAt('/some-unknown-page')
    expect(document.title).toBe('Wod.Wiki')
  })

  it('sets the base title for /journal deep detail routes (Journal is the legacy page)', () => {
    renderAt('/journal/2026-05-12')
    expect(document.title).toBe('Wod.Wiki - Journal')
  })

  it('sets the base title for /feeds deep detail routes', () => {
    renderAt('/feeds/daily-wod')
    expect(document.title).toBe('Wod.Wiki - Feeds')
  })

  it('sets the base title for /collections deep detail routes', () => {
    renderAt('/collections/cardio')
    expect(document.title).toBe('Wod.Wiki - Collections')
  })

  it('sets the base title for /library', () => {
    renderAt('/library')
    expect(document.title).toBe('Wod.Wiki - Library')
  })

  it('sets the base title for efforts list route', () => {
    renderAt('/efforts')
    expect(document.title).toBe('Wod.Wiki - Efforts')
  })

  it('sets the base title for analytics routes', () => {
    renderAt('/analytics')
    expect(document.title).toBe('Wod.Wiki - Analytics')

    cleanup()
    document.title = 'Test Setup Title'
    renderAt('/analytics/dashboard')
    expect(document.title).toBe('Wod.Wiki - Analytics')
  })

  it('sets the base title for review routes', () => {
    renderAt('/review/runtime-1')
    expect(document.title).toBe('Wod.Wiki - Review')
  })

  it('does not override the title for /effort/:slug', () => {
    renderAt('/effort/push-up')
    expect(document.title).toBe('Test Setup Title')
  })

  it('does not override the title for /playground/:id', () => {
    renderAt('/playground/abc')
    expect(document.title).toBe('Test Setup Title')
  })

  it('updates title on navigation and leaves exempt routes unchanged', () => {
    const { unmount: u1 } = renderAt('/library')
    expect(document.title).toBe('Wod.Wiki - Library')
    u1()

    const { unmount: u2 } = renderAt('/journal/2026-01-01')
    expect(document.title).toBe('Wod.Wiki - Journal')
    u2()

    const { unmount: u3 } = renderAt('/effort/push-up')
    expect(document.title).toBe('Wod.Wiki - Journal')
    u3()

    renderAt('/playground/abc')
    expect(document.title).toBe('Wod.Wiki - Journal')
  })
})
