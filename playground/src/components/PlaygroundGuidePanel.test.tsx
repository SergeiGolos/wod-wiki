import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { PlaygroundGuidePanel } from './PlaygroundGuidePanel'

describe('PlaygroundGuidePanel', () => {
  it('renders the core playground guidance and primary navigation links', () => {
    render(
      <MemoryRouter>
        <PlaygroundGuidePanel />
      </MemoryRouter>,
    )

    const collectionsLink = screen.getByRole('link', { name: /browse collections/i })
    const syntaxLink = screen.getByRole('link', { name: /learn syntax/i })

    expect(screen.getByText('Playground Flow')).toBeTruthy()
    expect(screen.getByText(/write the workout, then turn the unknown parts into measured output/i)).toBeTruthy()
    expect(collectionsLink.getAttribute('href')).toBe('/collections')
    expect(syntaxLink.getAttribute('href')).toBe('/getting-started')
    expect(screen.getByText(/what maps cleanly here/i)).toBeTruthy()
  })
})