import { useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { useWorkoutStore } from '../components/layout/WorkoutStore';
import { setActiveWorkoutId, setWodBlockRuntimeMeta } from './state-fields';

/**
 * Hook to synchronize Zustand WorkoutStore with CodeMirror EditorView.
 */
export function useEditorStateSync(view: EditorView | null) {
  const activeBlockId = useWorkoutStore(s => s.activeBlockId);
  const blocks = useWorkoutStore(s => s.blocks);

  // Sync active block ID
  useEffect(() => {
    if (!view) return;
    view.dispatch({
      effects: setActiveWorkoutId.of(activeBlockId)
    });
  }, [view, activeBlockId]);

  // Sync runtime metadata for each block
  useEffect(() => {
    if (!view) return;
    
    const effects = blocks.map(block => setWodBlockRuntimeMeta.of({
      blockId: block.id,
      state: block.state,
      // Mapping other relevant fields if needed
    }));

    if (effects.length > 0) {
      view.dispatch({ effects });
    }
  }, [view, blocks]);
}
