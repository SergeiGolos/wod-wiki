import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { SyntaxGroupWidget, type SyntaxGroupWidgetConfig } from './SyntaxGroupWidget'

const validConfig: SyntaxGroupWidgetConfig = {
  category: 'Timing',
  icon: '⏱️',
  title: 'Timers and Rest',
  description: 'Countdowns, movement lines, and forced rest.',
  example: '5:00 Run\n*:30 Rest\n10 Burpees',
  docsPath: '/guide/syntax/protocols?h=timers-and-rest',
}

afterEach(() => {
  cleanup()
})

describe('SyntaxGroupWidget', () => {
  it('renders syntax metadata and forwards docs action', () => {
    const opened: string[] = []

    render(<SyntaxGroupWidget config={validConfig} onOpenDocs={(path) => opened.push(path)} />)

    expect(screen.getByText('Timing')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /timers and rest/i })).toBeTruthy()
    expect(screen.getByText(/countdowns, movement lines, and forced rest/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /docs/i }))
    expect(opened).toEqual(['/guide/syntax/protocols?h=timers-and-rest'])
  })

  it('renders invalid-config feedback when required fields are missing', () => {
    render(
      <SyntaxGroupWidget
        config={{ category: '', icon: '', title: '', description: '', example: '', docsPath: '' }}
        onOpenDocs={() => {}}
      />,
    )

    expect(screen.getByText(/invalid/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /docs/i })).toBeNull()
  })
})
