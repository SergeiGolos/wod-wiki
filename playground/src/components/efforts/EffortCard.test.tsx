import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { EffortCard } from './EffortCard'
import type { IEffort } from '@/effort-registry'

const mockEffort = (overrides?: Partial<IEffort>): IEffort => ({
  id: 'test-id',
  slug: 'test-effort',
  label: 'Test Effort',
  aliases: ['test', 'testing'],
  baseAttributes: { met: 7.5, discipline: 'strength', intensityTier: 'high' },
  registrySource: 'bundled',
  ...overrides,
})

describe('EffortCard', () => {
  it('renders bundled effort with label, MET, and discipline', () => {
    render(<EffortCard effort={mockEffort()} />)

    expect(screen.getByText('Test Effort')).toBeTruthy()
    expect(screen.getByText(/MET 7\.5/)).toBeTruthy()
    expect(screen.getByText('strength')).toBeTruthy()
    expect(screen.getByText('Bundled')).toBeTruthy()
  })

  it('renders user effort with custom badge', () => {
    render(<EffortCard effort={mockEffort({ registrySource: 'user' })} />)

    expect(screen.getByText('Custom')).toBeTruthy()
  })

  it('calls onClick when clicked', () => {
    let clicked = false
    render(<EffortCard effort={mockEffort()} onClick={() => { clicked = true }} />)

    const card = screen.getByText('Test Effort').closest('div[class*="cursor-pointer"]')
    expect(card).toBeTruthy()
    if (!card) throw new Error('Card not found')
    fireEvent.click(card)
    expect(clicked).toBe(true)
  })

  it('truncates aliases to 4 with overflow indicator', () => {
    render(
      <EffortCard
        effort={mockEffort({ aliases: ['a', 'b', 'c', 'd', 'e', 'f'] })}
      />,
    )

    expect(screen.getByText('+2')).toBeTruthy()
  })
})
