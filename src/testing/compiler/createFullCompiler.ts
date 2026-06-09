/**
 * Test compiler factory.
 *
 * Re-exports the canonical createCompiler from runtimeServices.
 * Tests that need a subset of strategies can call createCompiler(customStrategies).
 *
 * @deprecated Use createCompiler instead. createFullCompiler is kept as a
 * backward-compatible alias and will be removed in a future release.
 */
import { createCompiler as _createCompiler, PRODUCTION_STRATEGIES } from '@/runtime/services/runtimeServices';

export { PRODUCTION_STRATEGIES };
export const createFullCompiler = _createCompiler;
export { _createCompiler as createCompiler };
