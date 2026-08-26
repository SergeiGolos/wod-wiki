/**
 * useZipProcessor — Global zip-load handler for the /load route.
 *
 * Branches on the param name (#882):
 *  - `?z=` (+ optional `by`) is the home-hero share contract: decode, persist
 *    to the home-shared localStorage store, redirect home — the hero editor
 *    renders it instead of welcome-1.md until the visitor resets it.
 *  - `?zip=` stays the playground flow: save as a new playground page in
 *    IndexedDB, redirect to /playground/:id.
 *
 * Only runs on the plain /load route — /load/journal* is handled by
 * useJournalZipProcessor.
 */
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryState } from 'nuqs';
import { playgroundPath, ROUTE_PATTERNS } from '../lib/routes';
import { decodeZip } from '../services/decodeZip';
import { buildSharedScript, saveHomeShared } from '../services/homeSharedScript';
import { formatPlaygroundTimestampId } from '@/lib/playgroundDisplay';
import { playgroundContent, pageId } from '../services/playgroundContent';

export function useZipProcessor() {
  const navigate = useNavigate();
  const location = useLocation();
  const [zipParam] = useQueryState('zip');
  const [zParam] = useQueryState('z');
  const [byParam] = useQueryState('by');

  useEffect(() => {
    // Only run on the plain /load route — avoid creating phantom notes when
    // /load/journal?zip=… is handled by useJournalZipProcessor, and prevent
    // PlanRedirect from leaking ?zip into /journal?zip=…
    if (location.pathname !== '/load') return;

    if (zParam) {
      let cancelled = false;
      (async () => {
        try {
          const content = await decodeZip(zParam);
          if (cancelled) return;
          saveHomeShared({ content: buildSharedScript(content, byParam ?? undefined), by: byParam ?? undefined });
        } catch (err) {
          console.error('Failed to decode zip:', err);
        }
        if (!cancelled) {
          navigate('/', { replace: true });
        }
      })();
      return () => { cancelled = true; };
    }

    if (!zipParam) return;

    let cancelled = false;
    (async () => {
      try {
        const content = await decodeZip(zipParam);
        if (cancelled) return;
        const now = Date.now();
        const id = formatPlaygroundTimestampId(now);
        const pageIdValue = pageId('playground', id);
        await playgroundContent.savePage({
          id: pageIdValue,
          category: 'playground',
          name: id,
          content,
          updatedAt: now,
        });
        if (!cancelled) {
          navigate(playgroundPath(id), { replace: true });
        }
      } catch (err) {
        console.error('Failed to decode zip:', err);
        if (!cancelled) {
          navigate(ROUTE_PATTERNS.playgroundRoot, { replace: true });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [zipParam, zParam, byParam, navigate, location.pathname]);
}
