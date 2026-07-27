import { describe, it, expect, beforeEach } from 'bun:test'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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
      <NavigateButton to="/journal">Go Journal</NavigateButton>
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

  it('sets the base title for journal routes', () => {
    renderAt('/journal')
    expect(document.title).toBe('Wod.Wiki - Journal')

    cleanup()
    document.title = 'Test Setup Title'
    renderAt('/journal/2026-05-12')
    expect(document.title).toBe('Wod.Wiki - Journal')
  })

  it('sets the base title for feeds routes', () => {
    renderAt('/feeds')
    expect(document.title).toBe('Wod.Wiki - Feeds')

    cleanup()
    document.title = 'Test Setup Title'
    renderAt('/feeds/daily-wod')
    expect(document.title).toBe('Wod.Wiki - Feeds')
  })

  it('sets the base title for collections routes', () => {
    renderAt('/collections')
    expect(document.title).toBe('Wod.Wiki - Collections')

    cleanup()
    document.title = 'Test Setup Title'
    renderAt('/collections/cardio')
    expect(document.title).toBe('Wod.Wiki - Collections')
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
    renderAt('/collections')
    expect(document.title).toBe('Wod.Wiki - Collections')

    fireEvent.click(screen.getByText('Go Journal'))
    expect(document.title).toBe('Wod.Wiki - Journal')

    fireEvent.click(screen.getByText('Go Effort'))
    expect(document.title).toBe('Wod.Wiki - Journal')

    fireEvent.click(screen.getByText('Go Playground'))
    expect(document.title).toBe('Wod.Wiki - Journal')
  })
})
