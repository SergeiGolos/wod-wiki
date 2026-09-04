'use client'

import * as Headless from '@headlessui/react'
import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { NavbarItem } from '@/components/organisms/layout/Navbar'
import { AppRail } from '../../app/nav/AppRail'

function OpenMenuIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true" className="[&>[data-slot=icon]]:size-5">
      <path d="M2 6.75C2 6.33579 2.33579 6 2.75 6H17.25C17.6642 6 18 6.33579 18 6.75C18 7.16421 17.6642 7.5 17.25 7.5H2.75C2.33579 7.5 2 7.16421 2 6.75ZM2 13.25C2 12.8358 2.33579 12.5 2.75 12.5H17.25C17.6642 12.5 18 12.8358 18 13.25C18 13.6642 17.6642 14 17.25 14H2.75C2.33579 14 2 13.6642 2 13.25Z" />
    </svg>
  )
}

function CloseMenuIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true" className="[&>[data-slot=icon]]:size-5">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}

function MobileSidebar({ open, close, children }: React.PropsWithChildren<{ open: boolean; close: () => void }>) {
  return (
    <Headless.Dialog open={open} onClose={close} className="lg:hidden">
      <Headless.DialogBackdrop
        transition
        className="fixed inset-0 bg-black/30 dark:bg-black/30 transition data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />
      <Headless.DialogPanel
        transition
        className="fixed inset-y-0 w-full max-w-80 p-2 transition duration-300 ease-out data-closed:-translate-x-full"
      >
        <div className="flex h-full flex-col rounded-lg bg-card shadow-xs ring-1 ring-foreground/5">
          <div className="-mb-3 px-4 pt-3">
            <Headless.CloseButton as={NavbarItem} aria-label="Close navigation">
              <CloseMenuIcon />
            </Headless.CloseButton>
          </div>
          {children}
        </div>
      </Headless.DialogPanel>
    </Headless.Dialog>
  )
}

export function SidebarLayout({
  navbar,
  sidebar,
  onSearch,
  children,
}: React.PropsWithChildren<{
  navbar: React.ReactNode
  sidebar: React.ReactNode
  /** Opens the global search palette — wired to the icon rail's search button. */
  onSearch?: () => void
}>) {
  let [showSidebar, setShowSidebar] = useState(false)
  const location = useLocation()

  // Close mobile sidebar on route change
  useEffect(() => {
    setShowSidebar(false)
  }, [location])

  return (
    <div className="relative isolate flex min-h-svh w-full bg-background max-lg:flex-col lg:flex-row">
      <div className="flex flex-1 w-full max-lg:flex-col lg:flex-row">
        {/* Icon rail — L1 destinations; desktop only (general layout) */}
        <div className="hidden lg:flex w-14 shrink-0 sticky top-0 h-svh flex-col items-center border-r border-zinc-950/5 dark:border-white/5 bg-background/72 backdrop-blur-sm z-40 py-3">
          <AppRail onSearch={onSearch ?? (() => {})} />
        </div>

        {/* Context sidebar — active L1's children/panel; overlay on mobile */}
        <nav className="hidden lg:flex lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:self-start lg:h-svh lg:overflow-y-auto lg:border-r lg:border-zinc-950/5 dark:lg:border-white/5 lg:bg-background/72 lg:backdrop-blur-sm">
          {sidebar}
        </nav>
        <MobileSidebar open={showSidebar} close={() => setShowSidebar(false)}>
          {sidebar}
        </MobileSidebar>

        {/* Content column — topbar (static on desktop: page headers own lg:top-0)
            + page. On mobile the header is the sticky navbar with hamburger. */}
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-20 flex items-center px-2 sm:px-4 bg-card lg:static lg:bg-background lg:border-b lg:border-zinc-950/5 dark:lg:border-white/5">
            <div className="py-2.5 shrink-0 lg:hidden">
              <NavbarItem onClick={() => setShowSidebar(true)} aria-label="Open navigation">
                <OpenMenuIcon />
              </NavbarItem>
            </div>
            <div className="min-w-0 flex-1">{navbar}</div>
          </header>

          <main className="flex flex-1 flex-col lg:min-w-0 lg:pt-2 lg:pr-2 lg:pb-2">
            <div className="grow w-full lg:overflow-visible">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
