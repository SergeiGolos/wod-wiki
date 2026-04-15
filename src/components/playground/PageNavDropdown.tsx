import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/playground/dropdown'
import { DocumentTextIcon, ChevronDownIcon, PlayIcon, CheckIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid'

export interface PageNavLink {
  id: string
  label: string
  /** 'heading' (default) or 'wod' for workout blocks */
  type?: 'heading' | 'wod'
  /** When set, a small Play button is rendered aligned to the right */
  onRun?: () => void
  /** Which icon to show for the run button: 'play' (default) or 'link' */
  runIcon?: 'play' | 'link'
  /** Optional timestamp for timeline view (e.g. '08:30') */
  timestamp?: string
  /** Optional number of workout completions */
  resultCount?: number;
  /** Whether the workout has been completed at least once */
  hasResult?: boolean;
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

  const activeLink = links.find(l => l.id === activeId) ?? links[0]
  const activeLabel = activeLink?.label ?? 'Sections'

  return (
    <Dropdown>
      <DropdownButton plain aria-label="Page sections" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <DocumentTextIcon className="size-3.5 shrink-0" />
        <span className="max-w-28 truncate">
          {activeLink?.timestamp && <span className="mr-1 opacity-60 tabular-nums italic">{activeLink.timestamp}</span>}
          {activeLabel}
        </span>
        <ChevronDownIcon className="size-3 shrink-0" />
      </DropdownButton>

      <DropdownMenu className="min-w-48" anchor="bottom end">
        {links.map(link => (
          <DropdownItem
            key={link.id}
            onClick={() => scrollToSection(link.id)}
          >
            <DropdownLabel className={cn(
              activeId === link.id ? 'font-bold text-foreground' : 'text-muted-foreground',
              link.type === 'wod' && 'pl-2 text-[11px]'
            )}>
              {link.type === 'wod' && (
                <span className="mr-2 inline-flex items-center gap-1">
                  {link.resultCount && link.resultCount > 1 ? (
                    <span className="flex items-center justify-center size-3.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold">
                      {link.resultCount}
                    </span>
                  ) : link.hasResult ? (
                    <CheckIcon className="size-3 text-primary" />
                  ) : link.runIcon === 'link' ? (
                    <ArrowTopRightOnSquareIcon className="inline size-3 opacity-30" />
                  ) : (
                    <PlayIcon className="inline size-3 opacity-30" />
                  )}
                </span>
              )}
              {link.timestamp && <span className="font-bold text-[10px] tabular-nums mr-2 opacity-60 italic">{link.timestamp}</span>}
              {link.label}
            </DropdownLabel>
            {link.onRun && (
              <button
                className="col-start-5 flex items-center justify-center size-5 rounded text-primary hover:bg-primary/10 transition-colors"
                title={link.runIcon === 'link' ? "View workout" : "Start workout"}
                onClick={(e) => { e.stopPropagation(); link.onRun!() }}
              >
                {link.runIcon === 'link' ? (
                  <ArrowTopRightOnSquareIcon className="size-3" />
                ) : (
                  <PlayIcon className="size-3" />
                )}
              </button>
            )}
            {!link.onRun && activeId === link.id && <span className="col-start-5 text-primary text-xs">✓</span>}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}
