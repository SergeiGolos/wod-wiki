import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryState } from 'nuqs';
import { v4 as uuidv4 } from 'uuid';
import { decodeZip } from '../services/decodeZip';
import { playgroundDB, PlaygroundDBService } from '../services/playgroundDB';

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
        const id = uuidv4();
        const now = Date.now();
        const pageId = PlaygroundDBService.pageId('playground', id);
        await playgroundDB.savePage({
          id: pageId,
          category: 'playground',
          name: id,
          content,
          updatedAt: now,
        });
        
        if (!cancelled) {
          navigate(`/playground/${id}`, { replace: true });
        }
      } catch (err) {
        console.error('Failed to decode zip:', err);
        if (!cancelled) {
          navigate('/playground', { replace: true });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [zipParam, zParam, navigate, setZipParam, setZParam]);
}
