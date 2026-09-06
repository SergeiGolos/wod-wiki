'use client'

import * as Headless from '@headlessui/react'
import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { NavbarItem } from '@/components/organisms/layout/Navbar'
import { AppRail } from '../../app/nav/AppRail'
import { MobileQuerySlotProvider } from '../panels/page-shells'
import { SecondaryNav } from '../../app/nav/SecondaryNav'
import type { MenuSpec } from '../../app/nav/menuModel'
import { ResponsiveActionsProvider } from '../../app/nav/ResponsiveActions'

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
  secondary,
  children,
}: React.PropsWithChildren<{
  navbar: React.ReactNode
  sidebar: React.ReactNode
  /** Opens the global search palette — wired to the icon rail's search button. */
  onSearch?: () => void
  /** Route-declared secondary nav (zone 4); the page index merges in. */
  secondary?: MenuSpec
}>) {
  let [showSidebar, setShowSidebar] = useState(false)
  const location = useLocation()

  // Close mobile sidebar on route change
  useEffect(() => {
    setShowSidebar(false)
  }, [location])

  return (
    <MobileQuerySlotProvider>
    <ResponsiveActionsProvider onSearch={onSearch}>
    <div className="relative isolate flex min-h-svh w-full bg-background max-lg:flex-col lg:flex-row">
      <div className="flex flex-1 w-full max-lg:flex-col lg:flex-row">
        {/* Main desktop nav — L1 Icon rail + L2 Context sidebar */}
        <nav aria-label="Main" className="hidden lg:flex">
          <div className="w-14 shrink-0 sticky top-0 h-svh flex flex-col items-center border-r border-zinc-950/5 dark:border-white/5 bg-background/72 backdrop-blur-sm z-40 py-3">
            <AppRail onSearch={onSearch ?? (() => {})} />
          </div>

          <div className="w-60 shrink-0 sticky top-0 self-start h-svh overflow-y-auto border-r border-zinc-950/5 dark:border-white/5 bg-background/72 backdrop-blur-sm flex flex-col">
            {sidebar}
          </div>
        </nav>
        <MobileSidebar open={showSidebar} close={() => setShowSidebar(false)}>
          {sidebar}
        </MobileSidebar>

        {/* Content column — on desktop, page headers (StickyPageHeader) own lg:top-0.
            On mobile, this sticky navbar carries the hamburger drawer trigger.
            At xl (1280px), content halts growth at 984px (1280px viewport - 56px rail - 240px sidebar),
            allowing right-side space to grow until the 240px secondary rail mounts at 2xl (1520px). */}
        <div className="flex flex-1 flex-col min-w-0 xl:max-w-[984px] 2xl:max-w-none">
          <header data-page-sticky-boundary="true" className="lg:hidden sticky top-0 z-20 flex items-center px-2 sm:px-4 bg-card border-b border-border/50">
            <div className="py-2.5 shrink-0">
              <NavbarItem onClick={() => setShowSidebar(true)} aria-label="Open navigation">
                <OpenMenuIcon />
              </NavbarItem>
            </div>
            <div className="min-w-0 flex-1">{navbar}</div>
          </header>

          <main className="flex flex-1 flex-col lg:min-w-0">
            {/* max-lg bottom padding keeps page content clear of the floating
                thumb dock (search + primary + overflow cluster). */}
            <div className="grow w-full max-lg:pb-36 lg:overflow-visible">
              {children}
            </div>
          </main>
        </div>

        {/* Secondary nav — zone 4; desktop (2xl+) only. Below 2xl the same
            entries collapse into the header ⋯ menu (see ActionsMenu).
            Between xl (1280px) and 2xl (1520px), content remains capped at 984px
            and right padding grows until the 240px rail fits without shrinking content. */}
        <aside className="hidden 2xl:flex w-60 shrink-0 sticky top-0 h-svh flex-col overflow-y-auto border-l border-zinc-950/5 dark:border-white/5 bg-background/72 backdrop-blur-sm">
          <SecondaryNav spec={secondary} />
        </aside>

      {/* Mobile thumb dock — single-mounted via ResponsiveActionsProvider
          (search FAB + page primary + overflow, aligned per the appearance
          preference); desktop search stays in the icon rail. */}
      </div>
    </div>
    </ResponsiveActionsProvider>
    </MobileQuerySlotProvider>
  )
}
