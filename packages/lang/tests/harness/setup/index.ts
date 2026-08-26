/**
 * Test Setup Actions - Index
 * 
 * Exports all test setup action types, factories, and registry utilities.
 */

// Core interfaces
export type {
  ITestSetupAction,
  TestSetupActionJSON,
  TestSetupActionFactory,
  TestSetupActionParamSchema
} from '../setup/ITestSetupAction';

// Concrete actions
export { SetMemoryValueAction, SetMemoryValueActionFactory } from '../setup/SetMemoryValueAction';
export type { SetMemoryValueParams } from '../setup/SetMemoryValueAction';

export { SetLoopIndexAction, SetLoopIndexActionFactory } from '../setup/SetLoopIndexAction';
export type { SetLoopIndexParams } from '../setup/SetLoopIndexAction';

export { SetTimerStateAction, SetTimerStateActionFactory } from '../setup/SetTimerStateAction';
export type { SetTimerStateParams } from '../setup/SetTimerStateAction';

export { SetEffortStateAction, SetEffortStateActionFactory } from '../setup/SetEffortStateAction';
export type { SetEffortStateParams } from '../setup/SetEffortStateAction';

export { AllocateTestMemoryAction, AllocateTestMemoryActionFactory } from '../setup/AllocateTestMemoryAction';
export type { AllocateTestMemoryParams } from '../setup/AllocateTestMemoryAction';

// Registry and utilities
export {
  getAllActionFactories,
  getActionFactory,
  registerActionFactory,
  createActionFromJSON,
  serializeActions,
  deserializeActions,
  TEST_SETUP_PRESETS,
  getPresetsByCategory,
  getPresetById,
  applyPresetWithBlockKey
} from '../setup/TestSetupActionRegistry';
export type { TestSetupPreset } from '../setup/TestSetupActionRegistry';
