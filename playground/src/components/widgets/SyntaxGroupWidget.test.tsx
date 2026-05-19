import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { SyntaxGroupWidget, type SyntaxGroupWidgetConfig } from './SyntaxGroupWidget'

const validConfig: SyntaxGroupWidgetConfig = {
  category: 'Timing',
  icon: '⏱️',
  title: 'Timers',
  description: 'Mix countdowns with interval rest blocks.',
  example: '2:00 Row\n*:30 Rest',
  docsPath: '/syntax#timers',
}

afterEach(() => {
  cleanup()
})

describe('SyntaxGroupWidget', () => {
  it('renders syntax metadata and forwards docs action', () => {
    const opened: string[] = []

    render(<SyntaxGroupWidget config={validConfig} onOpenDocs={(path) => opened.push(path)} />)

    expect(screen.getByText('Timing')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /timers/i })).toBeTruthy()
    expect(screen.getByText(/mix countdowns with interval rest blocks/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /docs/i }))
    expect(opened).toEqual(['/syntax#timers'])
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
