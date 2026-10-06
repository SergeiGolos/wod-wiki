import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import type { ScriptBlock } from '@/components/Editor/types'
import { buildZipUrl, openBlockInPlaygroundNewTab, shareBlock } from './openInPlayground'

const mockBlock: ScriptBlock = {
  id: 'test-block',
  contentId: 'test-content',
  dialect: 'time',
  startLine: 0,
  endLine: 3,
  content: 'AMRAP 10\n  10 Push-ups\n',
  state: 'idle',
  version: 1,
  createdAt: 1000,
  widgetIds: {},
}

describe('openInPlayground', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('buildZipUrl builds a valid /load?zip= URL with provenance', async () => {
    const url = await buildZipUrl(mockBlock, '/')
    expect(url).toContain('/load?zip=')
    expect(url).toContain('&src=%2F')
  })

  it('openBlockInPlaygroundNewTab opens the zip-load URL in a new window tab with _blank', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    await openBlockInPlaygroundNewTab(mockBlock)

    expect(openSpy).toHaveBeenCalledTimes(1)
    const [openedUrl, target] = openSpy.mock.calls[0]
    expect(target).toBe('_blank')
    expect(openedUrl).toContain('/load?zip=')
  })

  it('shareBlock copies the load URL to the clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    shareBlock(mockBlock)

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledTimes(1)
      expect(writeTextMock.mock.calls[0][0]).toContain('/load?zip=')
    })
  })
})
