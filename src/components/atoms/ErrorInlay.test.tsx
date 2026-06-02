import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'

import { ErrorInlay } from '@/components/atoms/ErrorInlay'

afterEach(() => {
  cleanup()
})

describe('ErrorInlay', () => {
  it('renders with role alert and the provided message', () => {
    render(<ErrorInlay message="Invalid JSON at position 4" />)

    const alert = screen.getByRole('alert')
    expect(alert).toBeTruthy()
    expect(alert.textContent).toContain('Widget JSON error')
    expect(alert.textContent).toContain('Invalid JSON at position 4')
  })

  it('exposes the correct data-testid', () => {
    render(<ErrorInlay message="Something went wrong" />)
    const alert = screen.getByTestId('widget-error-inlay')
    expect(alert).toBeTruthy()
  })

  it('renders the error icon for visual accessibility', () => {
    const { container } = render(<ErrorInlay message="Missing key" />)
    const icon = container.querySelector('svg')
    expect(icon).toBeTruthy()
  })

  it('merges custom className with base classes', () => {
    render(<ErrorInlay message="Error" className="my-extra-class" />)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('my-extra-class')
    expect(alert.className).toContain('rounded-xl')
  })

  it('displays multiline messages correctly', () => {
    render(<ErrorInlay message="Line 1\nLine 2" />)
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Line 1')
    expect(alert.textContent).toContain('Line 2')
  })
})
