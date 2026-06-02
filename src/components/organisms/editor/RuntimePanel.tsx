/**
 * RuntimePanel — DEPRECATED
 *
 * The fixed-position viewport panel has been superseded by RuntimeTimerPanel,
 * which renders inside the WodCompanion overlay slot.
 *
 * This file re-exports RuntimeTimerPanel under the old name so any stray
 * imports continue to compile.
 */
export { RuntimeTimerPanel as RuntimePanel } from "./RuntimeTimerPanel";
export type { RuntimeTimerPanelProps as RuntimePanelProps } from "./RuntimeTimerPanel";
