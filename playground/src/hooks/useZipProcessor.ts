import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryState } from 'nuqs';
import { playgroundPath, ROUTE_PATTERNS } from '../lib/routes';
import { decodeZip } from '../services/decodeZip';
import { playgroundDB, PlaygroundDBService } from '../services/playgroundDB';
import { formatPlaygroundTimestampId } from '@/lib/playgroundDisplay';

export function useZipProcessor() {
  const navigate = useNavigate();
  const [zipParam, setZipParam] = useQueryState('zip');
  const [zParam, setZParam] = useQueryState('z');

  useEffect(() => {
    const zip = zipParam || zParam;
    if (!zip) return;

    let cancelled = false;
    (async () => {
      try {
        const content = await decodeZip(zip);
        if (cancelled) return;
        const now = Date.now();
        const id = formatPlaygroundTimestampId(now);
        const pageId = PlaygroundDBService.pageId('playground', id);
        await playgroundDB.savePage({
          id: pageId,
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
  }, [zipParam, zParam, navigate, setZipParam, setZParam]);
}
