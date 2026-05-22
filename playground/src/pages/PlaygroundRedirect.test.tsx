import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const navigateCalls: Array<{ to: string; options?: { replace?: boolean } }> = []
const createPlaygroundPageCalls: string[] = []
let shouldFailCreatePlaygroundPage = false

mock.module('react-router-dom', () => ({
  useNavigate: () => (to: string, options?: { replace?: boolean }) => {
    navigateCalls.push({ to, options })
  },
  useParams: () => ({}),
  Navigate: ({ to }: { to: string }) => null,
}))

const createPlaygroundPageMock = mock(async (content: string) => {
  createPlaygroundPageCalls.push(content)
  if (shouldFailCreatePlaygroundPage) {
    throw new DOMException('Blocked by browser', 'SecurityError')
  }
  return '2026-05-19 15.30'
})

mock.module('../services/createPlaygroundPage', () => ({
  createPlaygroundPage: createPlaygroundPageMock,
}))

mock.module('../templates/defaultPlaygroundContent', () => ({
  EMPTY_PLAYGROUND_CONTENT: {
    content: '# New playground\n',
  },
  DEFAULT_PLAYGROUND_CONTENT: {
    content: '# Playground home\n',
  },
}))

const componentModule = import('./PlaygroundRedirect')

beforeEach(() => {
  navigateCalls.length = 0
  createPlaygroundPageCalls.length = 0
  shouldFailCreatePlaygroundPage = false
  createPlaygroundPageMock.mockClear()
})

describe('PlaygroundRedirect', () => {
  it('creates an empty playground note for the /playground entry route by default', async () => {
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

  it('creates the rich home playground note when template="home"', async () => {
    const { PlaygroundRedirect } = await componentModule

    render(<PlaygroundRedirect template="home" />)

    await waitFor(() => {
      expect(createPlaygroundPageCalls).toEqual(['# Playground home\n'])
      expect(navigateCalls).toEqual([
        {
          to: '/playground/2026-05-19%2015.30',
          options: { replace: true },
        },
      ])
    })
  })

  it('renders a retry state when note creation fails, then redirects after retry', async () => {
    const { PlaygroundRedirect } = await componentModule
    shouldFailCreatePlaygroundPage = true

    render(<PlaygroundRedirect />)

    await screen.findByText('Unable to create a new playground note.')
    expect(navigateCalls).toEqual([])

    shouldFailCreatePlaygroundPage = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => {
      expect(createPlaygroundPageCalls.length).toBeGreaterThanOrEqual(2)
      expect(createPlaygroundPageCalls.every(content => content === '# New playground\n')).toBe(true)
      expect(navigateCalls).toContainEqual({
        to: '/playground/2026-05-19%2015.30',
        options: { replace: true },
      })
    })
  })
})
