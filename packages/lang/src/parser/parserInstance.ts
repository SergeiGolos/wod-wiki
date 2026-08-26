import { MdTimerRuntime } from './md-timer';

export function createParser(): MdTimerRuntime {
  return new MdTimerRuntime();
}

/**
 * @deprecated Use createParser() instead.
 */
export const sharedParser = /* @__PURE__ */ createParser();
