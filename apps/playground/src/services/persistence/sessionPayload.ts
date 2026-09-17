import { eventsToStoredLogs } from '@bitcobblers/wod-wiki-wql';
import type { Sessions } from '@/components/Editor/types';
import type { EventRecord, Session } from '@/types/storage';

/**
 * Rebuild the statement-stream payload a session row used to carry inline.
 * Under V21 the `sessions` store holds execution metadata only; the
 * statements live as event rows and are reconstructed on read.
 */
export function sessionToPayload(session: Session, events: readonly EventRecord[] = []): Sessions {
  return {
    startTime: session.startTime,
    endTime: session.endTime,
    duration: session.duration,
    roundsCompleted: session.roundsCompleted,
    totalRounds: session.totalRounds,
    repsCompleted: session.repsCompleted,
    completed: session.completed,
    logs: eventsToStoredLogs(events),
  };
}
