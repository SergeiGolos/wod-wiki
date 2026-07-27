import { test, expect } from 'vitest'
import { workoutFiles } from './workoutIndex'
import { resolveSource } from '../canvas/canvasUtils'

/**
 * Regression guard for the "Source not found" bug.
 *
 * `workoutFiles` is a Vite `import.meta.glob`, so its keys are relative to
 * `lib/workoutIndex.ts` and shift depth when that file moves. When the glob
 * moved out of `App.tsx` (2 levels) into `lib/` (3 levels) the keys became
 * `../../../markdown/...`, but `resolveSource` looks up `../../markdown/...` —
 * so every canvas page rendered "Source not found". `workoutFiles` now
 * normalises its keys to the canonical 2-dot contract; these tests lock that in.
 *
 * Note: this test must run under a Vite-based runner (vitest) — bun's test
 * runner does not implement `import.meta.glob`.
 */
test('every exported glob key is in the canonical ../../markdown/ form', () => {
  const keys = Object.keys(workoutFiles)
  expect(keys.length).toBeGreaterThan(0)
  for (const key of keys) {
    expect(key.startsWith('../../../markdown/'), `key not normalised: ${key}`).toBe(false)
    expect(key.startsWith('../../markdown/'), `key missing canonical prefix: ${key}`).toBe(true)
  }
})

test('resolveSource round-trips the reported broken path against the real glob', () => {
  const dslPath = 'wods/examples/getting-started/timer-1.md'
  const expectedKey = '../../markdown/canvas/getting-started/timer-1.md'
  expect(expectedKey in workoutFiles).toBe(true)
  expect(resolveSource(dslPath, workoutFiles)).not.toContain('Source not found')
})
