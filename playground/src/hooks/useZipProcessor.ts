import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryState } from 'nuqs';
import { playgroundPath, ROUTE_PATTERNS } from '../lib/routes';
import { decodeZip } from '../services/decodeZip';
import { formatPlaygroundTimestampId } from '@/lib/playgroundDisplay';
import { playgroundContent, pageId } from '../services/playgroundContent';

export function useZipProcessor() {
  const navigate = useNavigate();
  const location = useLocation();
  const [zipParam, setZipParam] = useQueryState('zip');
  const [zParam, setZParam] = useQueryState('z');

  useEffect(() => {
    // Only run on the plain /load route — avoid creating phantom notes when
    // /load/journal?zip=… is handled by useJournalZipProcessor, and prevent
    // PlanRedirect from leaking ?zip into /journal?zip=…
    if (location.pathname !== '/load') return;

    const zip = zipParam || zParam;
    if (!zip) return;

    let cancelled = false;
    (async () => {
      try {
        const content = await decodeZip(zip);
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
  }, [zipParam, zParam, navigate, setZipParam, setZParam, location.pathname]);
}
