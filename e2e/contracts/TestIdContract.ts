/**
 * Re-exports the canonical TestIdContract from src/testing/contracts so that
 * e2e test files import from this path rather than crossing into app code.
 *
 * Import in e2e tests:
 *   import { TEST_IDS } from '../contracts/TestIdContract';
 */
export { TEST_IDS } from '../../src/testing/contracts/TestIdContract';
export type { TestId } from '../../src/testing/contracts/TestIdContract';
