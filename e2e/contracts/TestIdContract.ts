/**
 * Re-exports the canonical TestIdContract from src/testing/contracts so that
 * E2E tests can import from a stable local path.
 *
 * Import in E2E tests:
 *   import { TEST_IDS } from '../contracts/TestIdContract';
 */
export { TEST_IDS } from '../../src/testing/contracts/TestIdContract';
export type { TestId } from '../../src/testing/contracts/TestIdContract';
