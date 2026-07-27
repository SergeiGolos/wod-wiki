import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

class FakeDoc {
  constructor(private readonly value: string) {}
  toString() {
    return this.value
  }
}

const readOnly = { of: (value: boolean) => ({ type: 'readonly', value }) }

mock.module('@codemirror/state', () => ({
  EditorState: {
    readOnly,
    create: ({ doc, extensions }: { doc: string; extensions: unknown[] }) => ({
      doc: new FakeDoc(doc),
      extensions,
    }),
  },
}))

mock.module('@codemirror/view', () => {
  class MockEditorView {
    state: { doc: FakeDoc; extensions: unknown[] }

    constructor({ state, parent }: { state: { doc: FakeDoc; extensions: unknown[] }; parent: HTMLElement }) {
      this.state = state
      const host = document.createElement('div')
      host.className = 'cm-editor'
      parent.appendChild(host)
    }

    destroy() {}

    static theme(spec: unknown) {
      return { type: 'theme', spec }
    }
  }

  return {
    EditorView: MockEditorView,
    lineNumbers: () => ({ type: 'lineNumbers' }),
  }
})

mock.module('@codemirror/lang-markdown', () => ({
  markdown: () => ({ type: 'markdown' }),
}))

mock.module('@codemirror/theme-one-dark', () => ({
  oneDark: { type: 'oneDark' },
}))

import { CodeExampleWidget, type CodeExampleWidgetConfig } from './CodeExampleWidget'

const validConfig: CodeExampleWidgetConfig = {
  lines: [
    { code: '20:00 AMRAP', annotation: 'Classic AMRAP from the guide.' },
    { code: '  5 Pullups', annotation: 'Start each round with pullups.' },
  ],
  cta: 'Run this example',
}

afterEach(() => {
  cleanup()
})

describe('CodeExampleWidget', () => {
  it('renders configured lines and forwards runnable script on CTA click', () => {
    const calls: string[] = []

    render(<CodeExampleWidget config={validConfig} isDarkMode={false} onRun={(script) => calls.push(script)} />)

    expect(screen.getByRole('heading', { name: /code example/i })).toBeTruthy()
    expect(screen.getByText(/classic amrap from the guide/i)).toBeTruthy()
    expect(screen.getByText(/start each round with pullups/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /run this example/i }))

    expect(calls).toEqual(['20:00 AMRAP\n  5 Pullups'])
  })

  it('renders an invalid-config warning when no lines are provided', () => {
    render(
      <CodeExampleWidget
        config={{ lines: [], cta: 'Run this example' }}
        isDarkMode={false}
        onRun={() => {}}
      />,
    )

    expect(screen.getByText(/invalid/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /run this example/i })).toBeNull()
  })
})
