/**
 * ScopeBlockSearch — a WQL-powered content search for the Collections and
 * Feeds pages (#802). The user types a substring; the component runs
 * `find:block{text:<q>} in <scope>` through the QueryService and lists the
 * matching workout blocks from that static corpus.
 *
 * Additive: the page's existing registry browser stays intact; this surfaces
 * the same engine the Explorer uses, scoped to the page's content domain.
 */
import { useEffect, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { queryService } from '@/services/analytics/query';
import type { BlockIndexRow } from '@/types/storage';

export interface ScopeBlockSearchProps {
  /** Which static corpus to search: 'collections' or 'feeds'. */
  scope: 'collections' | 'feeds';
  placeholder?: string;
  /** Called when a result is clicked (e.g. navigate to the source). */
  onSelectBlock?: (block: BlockIndexRow) => void;
}

const DEBOUNCE_MS = 200;

export function ScopeBlockSearch({ scope, placeholder, onSelectBlock }: ScopeBlockSearchProps) {
  const [text, setText] = useState('');
  const [blocks, setBlocks] = useState<BlockIndexRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = text.trim();
    if (!q) { setBlocks([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const result = await queryService.runFind({
          raw: `find:block{text:${q}} in ${scope}`,
          target: 'block',
          filters: [{ key: 'text', negate: false, values: [{ value: q, wildcard: false }] }],
          scope,
        });
        if (!cancelled) setBlocks(result.blocks);
      } catch {
        if (!cancelled) setBlocks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [text, scope]);

  return (
    <div className="w-full">
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder ?? `Search ${scope} content…`}
          className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={`Search ${scope} content`}
        />
      </div>

      {text.trim() && (
        <div className="mt-2 space-y-1.5">
          {loading ? (
            <div className="text-xs text-muted-foreground px-1 py-1">Searching…</div>
          ) : blocks.length === 0 ? (
            <div className="text-xs text-muted-foreground px-1 py-1">No matching blocks.</div>
          ) : (
            blocks.map((block) => (
              <button
                key={block.id}
                type="button"
                onClick={() => onSelectBlock?.(block)}
                className="block w-full text-left border border-border rounded-md p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium text-sm">{block.noteTitle || block.noteId}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5">{block.dataType}</span>
                  {block.blockContentId && <span className="font-mono text-[10px]">{block.blockContentId}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{block.rawContent}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
