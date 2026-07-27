/**
 * Runtime barrel — intentionally narrow.
 *
 * External consumers import directly from source modules:
 *   - ScriptRuntime       → '@/runtime/ScriptRuntime'
 *   - Contracts           → '@/runtime/contracts'
 *   - Event types         → '@/runtime/events/{EventName}'
 *   - Behaviors           → '@/runtime/behaviors'
 *   - Compiler            → '@/runtime/compiler'
 *   - Sound models        → '@/runtime/models/SoundModels'
 *
 * Nothing in the codebase imports from this file directly.
 * Wildcard re-exports have been removed to avoid inflating the dead-symbol count.
 */
