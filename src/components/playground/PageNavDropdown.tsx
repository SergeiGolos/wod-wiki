import { useState, useEffect } from 'react'
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/playground/dropdown'
import { DocumentTextIcon, ChevronDownIcon, PlayIcon } from '@heroicons/react/20/solid'

export interface PageNavLink {
  id: string
  label: string
  /** 'heading' (default) or 'wod' for workout blocks */
  type?: 'heading' | 'wod'
  /** When set, a small Play button is rendered aligned to the right */
  onRun?: () => void
}

export interface PageNavDropdownProps {
  links: PageNavLink[]
  scrollToSection: (id: string) => void
  activeSectionId?: string
}

export function PageNavDropdown({
  links,
  scrollToSection,
  activeSectionId,
}: PageNavDropdownProps) {
  const [internalActiveId, setInternalActiveId] = useState(links[0]?.id ?? '')
  const activeId = activeSectionId ?? internalActiveId

  // Reset when links change (route change)
  useEffect(() => {
    if (!activeSectionId) {
      setInternalActiveId(links[0]?.id ?? '')
    }
  }, [links, activeSectionId])

  // Track the visible section via IntersectionObserver (if not controlled)
  useEffect(() => {
    if (links.length === 0 || activeSectionId) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            setInternalActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-60px 0px -40% 0px', threshold: [0, 0.3, 1.0] }
    )
    links.forEach(link => {
      const el = document.getElementById(link.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [links, activeSectionId])

  if (links.length === 0) return null

  const activeLabel = links.find(l => l.id === activeId)?.label ?? links[0]?.label ?? 'Sections'

  return (
    <Dropdown>
      <DropdownButton plain aria-label="Page sections" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <DocumentTextIcon className="size-3.5 shrink-0" />
        <span className="max-w-28 truncate">{activeLabel}</span>
        <ChevronDownIcon className="size-3 shrink-0" />
      </DropdownButton>
      <DropdownMenu className="min-w-48" anchor="bottom end">
        {links.map(link => (
          <DropdownItem
            key={link.id}
            onClick={() => { if (link.type !== 'wod') scrollToSection(link.id) }}
          >
            <DropdownLabel className={activeId === link.id ? 'font-bold' : undefined}>
              {link.type === 'wod' && <PlayIcon className="inline size-3 mr-1 opacity-50" />}
              {link.label}
            </DropdownLabel>
            {link.onRun && (
              <button
                className="col-start-5 flex items-center justify-center size-5 rounded text-primary hover:bg-primary/10 transition-colors"
                title="Start workout"
                onClick={(e) => { e.stopPropagation(); link.onRun!() }}
              >
                <PlayIcon className="size-3" />
              </button>
            )}
            {!link.onRun && activeId === link.id && <span className="col-start-5 text-primary text-xs">✓</span>}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}
