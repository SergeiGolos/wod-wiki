/**
 * useZipProcessor.test.ts — ticket #882: `/load` route branches on param.
 *
 *  - `?z=` (+ optional `by`) is the home-hero share contract: decode, persist
 *    to the home-shared localStorage store, redirect to `/`.
 *  - `?zip=` stays the playground-page flow: save to IndexedDB, redirect to
 *    the new playground page.
 *  - Off `/load` the hook does nothing (journal routes etc. have their own
 *    processors).
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { renderHook, waitFor } from '@testing-library/react'

let mockNavigate = mock(() => {})
let mockPathname = '/load'
let params: Record<string, string | null> = {}
const savePageMock = mock(() => Promise.resolve())

mock.module('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: mockPathname,
    search: '',
    hash: '',
    state: null,
    key: 'test',
  }),
}))

mock.module('nuqs', () => ({
  useQueryState: (key: string) => [params[key] ?? null, mock(() => {})],
}))

mock.module('../services/decodeZip', () => ({
  decodeZip: mock((z: string) => Promise.resolve(`decoded:${z}`)),
}))

mock.module('../services/playgroundContent', () => ({
  playgroundContent: { savePage: savePageMock },
  pageId: (category: string, id: string) => `${category}:${id}`,
}))

mock.module('../lib/routes', () => ({
  playgroundPath: (id: string) => `/playground/${id}`,
  ROUTE_PATTERNS: { playgroundRoot: '/playground' },
}))

import { useZipProcessor } from './useZipProcessor'

const SHARED_KEY = 'wodwiki.homeShared.v1'

describe('useZipProcessor', () => {
  beforeEach(() => {
    mockNavigate = mock(() => {})
    mockPathname = '/load'
    params = {}
    savePageMock.mockClear()
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('persists ?z= content with attribution to the home-shared store and redirects home', async () => {
    params = { z: 'abc', by: 'serge' }
    renderHook(() => useZipProcessor())

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }))
    expect(JSON.parse(window.localStorage.getItem(SHARED_KEY)!)).toEqual({
      content: 'decoded:abc',
      by: 'serge',
    })
    expect(savePageMock).not.toHaveBeenCalled()
  })

  it('persists ?z= content without attribution when no by param is present', async () => {
    params = { z: 'abc' }
    renderHook(() => useZipProcessor())

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }))
    const stored = JSON.parse(window.localStorage.getItem(SHARED_KEY)!)
    expect(stored.content).toBe('decoded:abc')
    expect(stored.by).toBeUndefined()
    expect(savePageMock).not.toHaveBeenCalled()
  })

  it('keeps the playground-page flow for ?zip=', async () => {
    params = { zip: 'abc' }
    renderHook(() => useZipProcessor())

    await waitFor(() => expect(savePageMock).toHaveBeenCalled())
    expect(window.localStorage.getItem(SHARED_KEY)).toBeNull()
    const navigatedTo = (mockNavigate.mock.calls[0] as unknown as [string])[0]
    expect(navigatedTo).toStartWith('/playground/')
  })

  it('does nothing off the /load route', async () => {
    mockPathname = '/load/journal'
    params = { z: 'abc', zip: 'abc' }
    renderHook(() => useZipProcessor())

    // Flush the microtask queue so any (unexpected) decode would have run.
    await Promise.resolve()
    await Promise.resolve()
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(savePageMock).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(SHARED_KEY)).toBeNull()
  })
})
