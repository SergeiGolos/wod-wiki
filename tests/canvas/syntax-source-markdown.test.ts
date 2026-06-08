import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { MdTimerRuntime } from '../../src/parser/md-timer'
import { TestScript, assertions } from '@/testing/script'
import { parseCanvasMarkdown, type ParsedCanvasPage, type PipelineStep } from '../../playground/src/canvas/parseCanvasMarkdown'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const syntaxDir = path.join(repoRoot, 'markdown/canvas/syntax')

function loadSyntaxPages(): Array<{ fileName: string; page: ParsedCanvasPage }> {
  return readdirSync(syntaxDir)
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => ({
      fileName,
      raw: readFileSync(path.join(syntaxDir, fileName), 'utf8'),
    }))
    .map(({ fileName, raw }) => ({ fileName, page: parseCanvasMarkdown(raw) }))
    .filter((entry): entry is { fileName: string; page: ParsedCanvasPage } => entry.page !== null)
}

function collectSourcePaths(page: ParsedCanvasPage): string[] {
  const sources: string[] = []

  for (const section of page.sections) {
    if (section.view?.source) sources.push(section.view.source)

    const pipelines: PipelineStep[][] = [
      ...section.commands.map(command => command.pipeline),
      ...section.buttons.map(button => button.pipeline),
      ...(section.view?.buttons.map(button => button.pipeline) ?? []),
    ]

    for (const pipeline of pipelines) {
      for (const step of pipeline) {
        if (step.action === 'set-source' && step.value !== 'query:new') {
          sources.push(step.value)
        }
      }
    }
  }

  return sources
}

function resolveDslPath(dslPath: string): string {
  if (dslPath.startsWith('markdown/')) {
    return path.join(repoRoot, dslPath)
  }

  if (dslPath.startsWith('wods/examples/')) {
    return path.join(repoRoot, 'markdown/canvas', dslPath.replace(/^wods\/examples\//, ''))
  }

  if (dslPath.startsWith('wods/')) {
    return path.join(repoRoot, 'markdown/canvas', dslPath.replace(/^wods\//, ''))
  }

  if (dslPath.startsWith('collections/')) {
    return path.join(repoRoot, 'markdown/collections', dslPath.replace(/^collections\//, ''))
  }

  if (dslPath.startsWith('canvas/')) {
    return path.join(repoRoot, 'markdown/canvas', dslPath.replace(/^canvas\//, ''))
  }

  return path.join(repoRoot, 'markdown', dslPath)
}

function extractScriptBlocks(raw: string): string[] {
  const matches = Array.from(raw.matchAll(/```wod\n([\s\S]*?)```/g))
  return matches.map(match => match[1].trim()).filter(Boolean)
}

describe('syntax canvas source fixtures', () => {
  const syntaxPages = loadSyntaxPages()
  const parser = new MdTimerRuntime()

  it('resolve every syntax page preview source to an existing markdown file', () => {
    for (const { fileName, page } of syntaxPages) {
      const sources = collectSourcePaths(page)

      for (const source of sources) {
        const resolvedPath = resolveDslPath(source)
        expect(existsSync(resolvedPath), `${fileName} should resolve ${source} to an existing file`).toBe(true)
      }
    }
  })

  it('never points a syntax preview at another canvas page', () => {
    for (const { fileName, page } of syntaxPages) {
      const sources = collectSourcePaths(page)

      for (const source of sources) {
        const resolvedPath = resolveDslPath(source)
        const raw = readFileSync(resolvedPath, 'utf8')

        expect(
          parseCanvasMarkdown(raw),
          `${fileName} should not preview another template: canvas page via ${source}`,
        ).toBeNull()
      }
    }
  })

  it('parses every referenced syntax example without MdTimerRuntime errors', () => {
    const uniqueSources = new Set(
      syntaxPages.flatMap(({ page }) => collectSourcePaths(page))
    )

    for (const source of uniqueSources) {
      const resolvedPath = resolveDslPath(source)
      const raw = readFileSync(resolvedPath, 'utf8')
      const scriptBlocks = extractScriptBlocks(raw)

      expect(scriptBlocks.length, `${source} should contain at least one \`wod\` block`).toBeGreaterThan(0)

      for (const scriptBlock of scriptBlocks) {
        const result = parser.read(scriptBlock)
        expect(result.errors, `${source} should parse cleanly`).toHaveLength(0)
      }
    }
  })
})

describe('syntax guide protocol examples compile to intended block types', () => {
  let script: TestScript | undefined

  afterEach(async () => {
    if (script) await script.dispose()
    script = undefined
  })

  function loadFirstScriptBlock(fileName: string): string {
    const raw = readFileSync(path.join(syntaxDir, fileName), 'utf8')
    const [firstBlock] = extractScriptBlocks(raw)
    expect(firstBlock, `${fileName} should contain a \`wod\` block`).toBeTruthy()
    return firstBlock
  }

  it('classic AMRAP example compiles as AMRAP', async () => {
    script = await TestScript.compile(loadFirstScriptBlock('classic-amrap.md'));
    await script.next();

    const state = await script.snapshot();
    expect(state.blocks.some(block => block.blockType === 'AMRAP')).toBe(true);
  });

  it('basic EMOM example compiles as EMOM', async () => {
    script = await TestScript.compile(loadFirstScriptBlock('basic-emom.md'));
    await script.next();

    const state = await script.snapshot();
    expect(state.blocks.some(block => block.blockType === 'EMOM')).toBe(true);
  });

  it('standard Tabata example compiles as a rounds block', async () => {
    script = await TestScript.compile(loadFirstScriptBlock('protocols-4.md'));
    await script.next();

    const state = await script.snapshot();
    expect(state.blocks.some(block => block.blockType === 'Rounds')).toBe(true);
  });

  it('plain timer example compiles as a timer block', async () => {
    script = await TestScript.compile(loadFirstScriptBlock('timers-rest.md'));
    await script.next();

    const state = await script.snapshot();
    expect(state.blocks.some(block => /timer/i.test(block.blockType))).toBe(true);
  });
});
