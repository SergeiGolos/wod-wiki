import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderIcon, ChevronRightIcon } from 'lucide-react';
import { getWodCollections, type WodCollection } from '@/repositories/wod-collections';
import { useCollectionsQueryState } from '../hooks/useCollectionsQueryState';
import { getCategoryGroups, getAssignedIds } from '../config/collectionGroups';
import { findCanvasPage } from '../canvas/canvasRoutes';
import { CollectionListTemplate, type CollectionListGroup } from '../templates/CollectionListTemplate';
import { ListPreludeCanvas } from '../templates/ListPreludeCanvas';

/** Special collection link component — navigates to the collection canvas route */
function CollectionLink({ collection }: { collection: WodCollection }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/collections/${encodeURIComponent(collection.id)}`)}
      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors text-left group"
    >
      <div className="flex-shrink-0 size-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
        <FolderIcon className="size-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-foreground truncate uppercase tracking-tight">
          {collection.name}
        </h3>
        <p className="text-xs text-muted-foreground font-medium">
          {collection.count} workout{collection.count !== 1 ? 's' : ''}
        </p>
      </div>
      <ChevronRightIcon className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export function CollectionsPage() {
  const { text, selectedCategories } = useCollectionsQueryState();
  const prependedCanvasPage = useMemo(() => findCanvasPage('/collections'), []);
  const query = useMemo(() => ({ text, selectedCategories }), [selectedCategories, text]);

  const loadCollections = useMemo(
    () => (currentQuery: typeof query) => {
      let result = getWodCollections();
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

  const groupCollections = useMemo(
    () => (collections: WodCollection[], currentQuery: typeof query): CollectionListGroup<WodCollection>[] => {
      const categoryGroups = getCategoryGroups();
      const assignedIds = getAssignedIds();
      const filteredMap = new Map(collections.map(collection => [collection.id, collection]));
      const groupedCollections: CollectionListGroup<WodCollection>[] = [];

      const activeCategories = currentQuery.selectedCategories.length > 0
        ? currentQuery.selectedCategories
        : Object.keys(categoryGroups);

      for (const category of activeCategories) {
        const ids = categoryGroups[category] ?? [];
        const items = ids.map(id => filteredMap.get(id)).filter(Boolean) as WodCollection[];
        if (items.length > 0) {
          const label = category.charAt(0).toUpperCase() + category.slice(1);
          groupedCollections.push({ id: category, label, items });
        }
      }

      if (currentQuery.selectedCategories.length === 0) {
        const ungrouped = collections.filter(collection => !assignedIds.has(collection.id));
        if (ungrouped.length > 0) {
          const existingGroup = groupedCollections.find(group => group.id === 'other');
          if (existingGroup) {
            existingGroup.items.push(...ungrouped);
          } else {
            groupedCollections.push({ id: 'other', label: 'Other', items: ungrouped });
          }
        }
      }

      return groupedCollections;
    },
    [],
  );

  return (
    <CollectionListTemplate
      query={query}
      loadRecords={loadCollections}
      mapRecordToItem={collection => collection}
      getItemKey={collection => collection.id}
      groupItems={groupCollections}
      prependedCanvas={prependedCanvasPage ? <ListPreludeCanvas page={prependedCanvasPage} /> : undefined}
      renderRecord={collection => <CollectionLink collection={collection} />}
    />
  );
}
