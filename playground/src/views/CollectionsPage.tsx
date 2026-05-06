import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderIcon, ChevronRightIcon } from 'lucide-react';
import { getWodCollections, type WodCollection } from '@/repositories/wod-collections';
import { useCollectionsQueryState } from '../hooks/useCollectionsQueryState';
import { findCanvasPage } from '../canvas/canvasRoutes';
import { CollectionListTemplate } from '../templates/CollectionListTemplate';
import { ListPreludeCanvas } from '../templates/ListPreludeCanvas';

function CollectionRow({ collection }: { collection: WodCollection }) {
  const hasCategories = collection.categories.length > 0;

  return (
    <div className="w-full flex items-center gap-4 px-6 py-4 text-left group">
      <div className="flex-shrink-0 size-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
        <FolderIcon className="size-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-foreground truncate uppercase tracking-tight">
          {collection.name}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-1">
          <p className="text-xs text-muted-foreground font-medium">
            {collection.count} workout{collection.count !== 1 ? 's' : ''}
          </p>
          {hasCategories ? collection.categories.map(category => (
            <span
              key={category}
              className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary"
            >
              {category.replace(/-/g, ' ')}
            </span>
          )) : (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              Other
            </span>
          )}
        </div>
      </div>
      <ChevronRightIcon className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export function CollectionsPage() {
  const { text, selectedCategories } = useCollectionsQueryState();
  const prependedCanvasPage = useMemo(() => findCanvasPage('/collections'), []);
  const query = useMemo(() => ({ text, selectedCategories }), [selectedCategories, text]);
  const navigate = useNavigate();

  const loadCollections = useMemo(
    () => (currentQuery: typeof query) => {
      let result = getWodCollections();

      if (currentQuery.selectedCategories.length > 0) {
        result = result.filter(collection =>
          collection.categories.some(category => currentQuery.selectedCategories.includes(category)),
        );
      }

      if (currentQuery.text.trim()) {
        const normalizedQuery = currentQuery.text.toLowerCase();
        result = result.filter(collection =>
          collection.name.toLowerCase().includes(normalizedQuery)
          || collection.id.toLowerCase().includes(normalizedQuery),
        );
      }
      return result;
    },
    [],
  );

  return (
    <CollectionListTemplate
      query={query}
      loadRecords={loadCollections}
      mapRecordToItem={collection => collection}
      getItemKey={collection => collection.id}
      prependedCanvas={prependedCanvasPage ? <ListPreludeCanvas page={prependedCanvasPage} /> : undefined}
      renderPrimaryContent={collection => <CollectionRow collection={collection} />}
      getItemActions={collection => [
        {
          id: 'open',
          label: 'Open',
          onSelect: item => navigate(`/collections/${encodeURIComponent(item.id)}`),
        },
      ]}
    />
  );
}
