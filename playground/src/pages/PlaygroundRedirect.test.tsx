import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { render, waitFor } from '@testing-library/react'

const navigateCalls: Array<{ to: string; options?: { replace?: boolean } }> = []
const createPlaygroundPageCalls: string[] = []

mock.module('react-router-dom', () => ({
  useNavigate: () => (to: string, options?: { replace?: boolean }) => {
    navigateCalls.push({ to, options })
  },
}))

mock.module('../services/createPlaygroundPage', () => ({
  createPlaygroundPage: async (content: string) => {
    createPlaygroundPageCalls.push(content)
    return '2026-05-19 15.30'
  },
}))

mock.module('../templates/defaultPlaygroundContent', () => ({
  EMPTY_PLAYGROUND_CONTENT: {
    content: '# New playground\n',
  },
}))

const componentModule = import('./PlaygroundRedirect')

beforeEach(() => {
  navigateCalls.length = 0
  createPlaygroundPageCalls.length = 0
})

describe('PlaygroundRedirect', () => {
  it('creates a fresh playground note and redirects to its canonical route', async () => {
    const { PlaygroundRedirect } = await componentModule

    render(<PlaygroundRedirect />)

    await waitFor(() => {
      expect(createPlaygroundPageCalls).toEqual(['# New playground\n'])
      expect(navigateCalls).toEqual([
        {
          to: '/playground/2026-05-19%2015.30',
          options: { replace: true },
        },
      ])
    })
  })
})
