/**
 * Re-exports the canonical TestIdContract from stories/_shared so that
 * e2e test files import from this path rather than crossing into stories/.
 *
 * Import in e2e tests:
 *   import { TEST_IDS } from '../contracts/TestIdContract';
 */
export { TEST_IDS } from '../../stories/_shared/TestIdContract';
export type { TestId } from '../../stories/_shared/TestIdContract';
