import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryState } from 'nuqs';
import { playgroundPath, ROUTE_PATTERNS } from '../lib/routes';
import { decodeZip } from '../services/decodeZip';
import { formatPlaygroundTimestampId } from '@/lib/playgroundDisplay';
import { journalNotes } from '../services/journalNotes';

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
        const note = await journalNotes.create({
          journalDate: '',
          title: id,
          rawContent: content,
          type: 'playground',
          slug: `playground/${id}`,
          createdFrom: { kind: 'zip' },
        });
        
        if (!cancelled) {
          navigate(playgroundPath(note.id), { replace: true });
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
