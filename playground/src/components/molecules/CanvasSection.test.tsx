import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'

import { CanvasSection } from './CanvasSection'
import type { CanvasSection as CanvasSectionType } from '../../canvas/parseCanvasMarkdown'
import type { NavActionDeps } from '../../nav/navTypes'

const noopDeps: NavActionDeps = {
  navigate: () => {},
  setQueryParam: () => {},
  scrollToSection: () => {},
}

function makeSection(
  proseChunks: CanvasSectionType['proseChunks'],
  buttons: CanvasSectionType['buttons'] = [],
): CanvasSectionType {
  const prose = proseChunks
    ?.filter((c): c is { kind: 'prose'; text: string } => c.kind === 'prose')
    .map((c) => c.text)
    .join('') ?? ''
  return {
    id: 'sec-1',
    heading: 'Test',
    level: 2,
    attrs: [],
    prose,
    proseChunks,
    commands: [],
    buttons,
    examples: [],
  }
}

afterEach(() => {
  cleanup()
})

describe('CanvasSection inline button rendering', () => {
  it('renders each prose chunk followed by its associated button', () => {
    const section = makeSection([
      { kind: 'prose', text: 'First paragraph about a workout.' },
      {
        kind: 'button',
        button: {
          label: 'Try First',
          target: 'a',
          pipeline: [{ action: 'set-state', value: 'track' }],
        },
      },
      { kind: 'prose', text: 'Second paragraph with more detail.' },
      {
        kind: 'button',
        button: {
          label: 'Try Second',
          target: 'b',
          pipeline: [{ action: 'set-state', value: 'track' }],
        },
      },
      { kind: 'prose', text: 'Tail paragraph after both buttons.' },
    ])

    render(
      <CanvasSection
        section={section}
        idx={0}
        blockId={section.id}
        keySuffix="default"
        deps={noopDeps}
        onExampleSelect={() => {}}
        selectedExampleIndex={0}
      />,
    )

    // Both button labels are present in the DOM, in order
    const firstButton = screen.getByRole('button', { name: /try first/i })
    const secondButton = screen.getByRole('button', { name: /try second/i })
    expect(firstButton).toBeTruthy()
    expect(secondButton).toBeTruthy()

    const firstNode = firstButton.compareDocumentPosition(secondButton)
    // Node.DOCUMENT_POSITION_FOLLOWING === 4
    expect((firstNode & 4) === 4).toBe(true)
  })

  it('does not render a trailing button group when proseChunks already contains the buttons', () => {
    const section = makeSection(
      [
        { kind: 'prose', text: 'One paragraph.' },
        {
          kind: 'button',
          button: {
            label: 'Inline Only',
            target: 'a',
            pipeline: [{ action: 'set-state', value: 'track' }],
          },
        },
        { kind: 'prose', text: '' },
      ],
      // Mirror the inline button in the legacy field — should NOT be rendered twice.
      [
        {
          label: 'Inline Only',
          target: 'a',
          pipeline: [{ action: 'set-state', value: 'track' }],
        },
      ],
    )

    render(
      <CanvasSection
        section={section}
        idx={0}
        blockId={section.id}
        keySuffix="default"
        deps={noopDeps}
        onExampleSelect={() => {}}
        selectedExampleIndex={0}
      />,
    )

    const matches = screen.getAllByRole('button', { name: /inline only/i })
    expect(matches).toHaveLength(1)
  })

  it('renders a section with a single prose chunk', () => {
    const section: CanvasSectionType = {
      id: 'sec-single',
      heading: 'Single',
      level: 2,
      attrs: [],
      prose: 'Some legacy prose.',
      proseChunks: [{ kind: 'prose', text: 'Some legacy prose.' }],
      commands: [],
      buttons: [],
    }

    render(
      <CanvasSection
        section={section}
        idx={0}
        blockId={section.id}
        keySuffix="default"
        deps={noopDeps}
        onExampleSelect={() => {}}
        selectedExampleIndex={0}
      />,
    );

    expect(screen.getByText(/some legacy prose/i)).toBeTruthy();
  });
})
