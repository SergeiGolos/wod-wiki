/**
 * EditorCastBridge — renderless component that sends preview data to the
 * Chromecast receiver when a cast session is active but no runtime is running.
 *
 * Placement: inside NoteEditor, alongside the OverlayTrack.
 *
 * Responsibilities:
 * - When castTransport is connected and no inline runtime is active:
 *   sends 'rpc-workbench-update' with mode='preview' and rich block data.
 * - When sections change (e.g., user navigates to a different workout page):
 *   re-sends the preview with updated block info.
 * - Does NOT send anything when a runtime is active — RuntimeTimerPanel
 *   handles 'active' mode independently.
 */

import { useEffect, useRef } from 'react';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';
import type { EditorSection } from '../extensions/section-state';
import type { RpcWorkbenchUpdate } from '@/services/cast/rpc/RpcMessages';
import type { RpcMessage } from '@/services/cast/rpc/RpcMessages';
import type { EditorState } from '@codemirror/state';
import type { WodBlock } from '../types';

interface EditorCastBridgeProps {
  /** All parsed editor sections */
  sections: EditorSection[];
  /** Whether an inline runtime is currently active */
  isRuntimeActive: boolean;
  /** CodeMirror EditorState — used to extract section content */
  editorState: EditorState | null;
  /** Called when the Chromecast receiver selects a block to start */
  onSelectBlock?: (block: WodBlock) => void;
}

export const EditorCastBridge: React.FC<EditorCastBridgeProps> = ({
  sections,
  isRuntimeActive,
  editorState,
  onSelectBlock,
}) => {
  const castTransport = useWorkbenchSyncStore(s => s.castTransport);
  const lastFingerprintRef = useRef('');

  useEffect(() => {
    if (!castTransport?.connected || isRuntimeActive || !editorState) return;

    const wodSections = sections.filter(s => s.type === 'wod');

    const blocks = wodSections.map(section => {
      const content =
        section.contentFrom !== undefined && section.contentTo !== undefined
          ? editorState.doc.sliceString(section.contentFrom, section.contentTo)
          : '';

      const lines = content.split('\n').filter(l => l.trim().length > 0);
      const contentPreview = lines.slice(0, 3).join('\n');

      // Extract a timer hint from the first line that looks like a duration (e.g. "10:00")
      const timerMatch = content.match(/^(\d{1,2}:\d{2}(?::\d{2})?)/m);
      const timerHint = timerMatch?.[1];

      // Derive a title from the first non-empty line or fall back to dialect
      const title = lines[0]?.substring(0, 60) || section.dialect || 'Workout';

      return {
        id: section.id,
        title,
        statementCount: lines.length,
        contentPreview,
        timerHint,
        dialect: section.dialect || 'wod',
      };
    });

    const message: RpcWorkbenchUpdate = {
      type: 'rpc-workbench-update',
      mode: blocks.length > 0 ? 'preview' : 'idle',
      previewData: blocks.length > 0 ? {
        title: blocks[0].title,
        blocks,
      } : undefined,
    };

    // Deduplicate sends
    const fingerprint = JSON.stringify(message);
    if (fingerprint === lastFingerprintRef.current) return;
    lastFingerprintRef.current = fingerprint;

    try {
      castTransport.send(message);
    } catch {
      // Transport may have disconnected between check and send
    }
  }, [castTransport, sections, isRuntimeActive, editorState]);

  // Reset fingerprint when transport disconnects so we re-send on reconnect
  useEffect(() => {
    if (!castTransport?.connected) {
      lastFingerprintRef.current = '';
    }
  }, [castTransport]);

  // Reset fingerprint when the runtime becomes inactive so the preview
  // is re-sent even if the sections haven't changed. Without this, closing
  // the track screen would leave the Chromecast stuck on idle/review.
  useEffect(() => {
    if (!isRuntimeActive) {
      lastFingerprintRef.current = '';
    }
  }, [isRuntimeActive]);

  // Listen for 'select-block' events from the receiver and resolve them
  // against the current editor sections to start the inline runtime.
  useEffect(() => {
    if (!castTransport?.connected || !onSelectBlock || !editorState) return;

    const unsub = castTransport.onMessage((message: RpcMessage) => {
      if (message.type !== 'rpc-event' || (message as any).name !== 'select-block') return;

      const { index, blockId } = ((message as any).data ?? {}) as { index?: number; blockId?: string };
      const wodSections = sections.filter(s => s.type === 'wod');

      const targetSection = blockId
        ? wodSections.find(s => s.id === blockId)
        : wodSections[index ?? 0];

      if (!targetSection || !editorState) return;

      const content =
        targetSection.contentFrom !== undefined && targetSection.contentTo !== undefined
          ? editorState.doc.sliceString(targetSection.contentFrom, targetSection.contentTo)
          : '';

      const block: WodBlock = {
        id: targetSection.id,
        dialect: targetSection.dialect || 'wod',
        startLine: targetSection.startLine - 1,
        endLine: targetSection.endLine - 1,
        content,
        state: 'idle',
        version: 1,
        createdAt: Date.now(),
        widgetIds: {},
      };

      onSelectBlock(block);
    });

    return unsub;
  }, [castTransport, sections, editorState, onSelectBlock, isRuntimeActive]);

  return null;
};
