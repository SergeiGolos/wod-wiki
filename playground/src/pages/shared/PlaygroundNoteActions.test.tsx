import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const navigateCalls: string[] = []
const createPlaygroundPageCalls: string[] = []

mock.module('react-router-dom', () => ({
  useNavigate: () => (to: string) => {
    navigateCalls.push(to)
  },
}))

mock.module('@/components/cast/CastButtonRpc', () => ({
  CastButtonRpc: () => <div data-testid="cast-button" />,
}))

mock.module('./PageToolbar', () => ({
  ActionsMenu: () => <div data-testid="actions-menu" />,
}))

mock.module('./pageUtils', () => ({
  mapIndexToL3: () => [],
}))

mock.module('../../services/createPlaygroundPage', () => ({
  createPlaygroundPage: async (content: string) => {
    createPlaygroundPageCalls.push(content)
    return 'fresh-page'
  },
}))

const componentModule = import('./PlaygroundNoteActions')
const templateModule = import('../../templates/defaultPlaygroundContent')

beforeEach(() => {
  navigateCalls.length = 0
  createPlaygroundPageCalls.length = 0
})

describe('PlaygroundNoteActions', () => {
  it('creates an empty playground on new and resets to the default content on reset', async () => {
    const onReset = mock(async () => {})
    const { PlaygroundNoteActions } = await componentModule
    const { EMPTY_PLAYGROUND_CONTENT } = await templateModule

    render(
      <PlaygroundNoteActions
        currentWorkout={{ name: 'Playground', content: 'current content' }}
        index={[]}
        onReset={onReset}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /new/i }))

    await waitFor(() => {
      expect(createPlaygroundPageCalls).toEqual([EMPTY_PLAYGROUND_CONTENT.content])
      expect(navigateCalls).toEqual(['/playground/fresh-page'])
    })

    fireEvent.click(screen.getByRole('button', { name: /reset playground to default/i }))

    await waitFor(() => {
      expect(onReset).toHaveBeenCalledTimes(1)
    })
  })
})