import { useState, useRef } from 'react'
import { ParallaxSection, scrollToSection } from '../components/ParallaxSection'
import { FrozenEditorPanel, type FrozenEditorPanelHandle } from '../components/FrozenEditorPanel'
import { CollectionCommandBar } from '../components/CollectionCommandBar'
import { CollectionItemList } from '@/components/workbench/CollectionItemList'
import { COLLECTIONS_STEPS } from '../data/parallaxActSteps'
import type { WodCollection, WodCollectionItem } from '@/repositories/wod-collections'

export interface CollectionsParallaxSectionProps {
  actualTheme: string
  collections: WodCollection[]
  onRun: (script: string) => void
}

export function CollectionsParallaxSection({
  actualTheme,
  collections,
  onRun,
}: CollectionsParallaxSectionProps) {
  const [activeCollectionId, setActiveCollectionId] = useState<string>(collections[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<WodCollectionItem | null>(null)
  const collectionsEditorRef = useRef<FrozenEditorPanelHandle>(null)

  const activeCollection = collections.find(c => c.id === activeCollectionId)
  const filteredItems = (activeCollection?.items ?? []).filter(item =>
    !query || item.name.toLowerCase().includes(query.toLowerCase())
  )

  function handleItemSelect(item: WodCollectionItem) {
    setSelectedItem(item)
    collectionsEditorRef.current?.loadScript(item.content)
  }

  function handleCollectionRun(script: string) {
    onRun(script)
    scrollToSection('tracker')
  }

  return (
    <ParallaxSection
      id="collections"
      steps={COLLECTIONS_STEPS}
      stickyAlign="right"
      chromeTitle="Collections — Plan"
      stickyContent={() => (
        <FrozenEditorPanel
          ref={collectionsEditorRef}
          activeStep={0}
          selectedExample={0}
          actualTheme={actualTheme}
          onRun={handleCollectionRun}
          steps={COLLECTIONS_STEPS}
        />
      )}
      headerContent={
        <CollectionCommandBar
          collections={collections}
          activeCollectionId={activeCollectionId}
          query={query}
          onQueryChange={setQuery}
          onCollectionChange={setActiveCollectionId}
        />
      }
      renderStepExtra={(stepIdx) =>
        stepIdx === 1 ? (
          <CollectionItemList
            items={filteredItems}
            activeItemId={selectedItem?.id ?? null}
            onSelectItem={handleItemSelect}
            className="mt-4 max-h-64 overflow-y-auto rounded-lg ring-1 ring-border"
          />
        ) : null
      }
      className="bg-background"
    />
  )
}
