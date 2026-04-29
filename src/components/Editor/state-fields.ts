// CM6 StateField definitions for the Note Editor.
// Active workout ID and WOD block runtime metadata were removed — they duplicated
// Zustand WorkoutStore state (activeBlockId, blocks) and were never consumed by
// any CM6 plugin/extension.  Consumers should read directly from the store:
//   import { useWorkoutStore } from '../layout/WorkoutStore';
//   const activeBlockId = useWorkoutStore(s => s.activeBlockId);
