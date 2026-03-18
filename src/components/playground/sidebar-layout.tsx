'use client'

import * as Headless from '@headlessui/react'
import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { NavbarItem } from './navbar'

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
        className="fixed inset-0 bg-black/30 transition data-closed:opacity-0 data-enter:duration-700 data-enter:ease-in-out data-leave:duration-700 data-leave:ease-in-out"
      />
      <Headless.DialogPanel
        transition
        className="fixed inset-y-0 w-full max-w-80 p-2 transition duration-700 ease-in-out data-closed:-translate-x-full"
      >
        <div className="flex h-full flex-col rounded-lg bg-white shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
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
  children,
}: React.PropsWithChildren<{ navbar: React.ReactNode; sidebar: React.ReactNode }>) {
  let [showSidebar, setShowSidebar] = useState(false)
  let [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()

  // Close mobile sidebar on route change
  useEffect(() => {
    setShowSidebar(false)
  }, [location])

  return (
    <div className="relative isolate flex min-h-svh w-full bg-white max-lg:flex-col lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950">
      {/* Sidebar on desktop */}
      <div 
        className={clsx(
          "fixed inset-y-0 left-0 transition-all duration-700 ease-in-out max-lg:hidden",
          isCollapsed ? "w-0 -translate-x-full" : "w-64 translate-x-0"
        )}
      >
        {sidebar}
      </div>

      {/* Sidebar on mobile */}
      <MobileSidebar open={showSidebar} close={() => setShowSidebar(false)}>
        {sidebar}
      </MobileSidebar>

      {/* Navbar on mobile */}
      <header className="sticky top-0 z-20 flex items-center px-4 bg-white dark:bg-zinc-900 lg:hidden">
        <div className="py-2.5">
          <NavbarItem onClick={() => setShowSidebar(true)} aria-label="Open navigation">
            <OpenMenuIcon />
          </NavbarItem>
        </div>
        <div className="min-w-0 flex-1">{navbar}</div>
      </header>

      {/* Desktop Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={clsx(
          "fixed top-4 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-zinc-950/10 transition-all duration-700 ease-in-out hover:bg-zinc-50 max-lg:hidden dark:bg-zinc-800 dark:ring-white/10 dark:hover:bg-zinc-700",
          isCollapsed ? "left-4" : "left-[15rem]"
        )}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={clsx("h-5 w-5 transition-transform duration-700 ease-in-out", isCollapsed ? "" : "rotate-180")}
        >
          <path
            fillRule="evenodd"
            d="M10.21 14.77a.75.75 0 01.02-1.06L12.94 11H4.75a.75.75 0 010-1.5h8.19l-2.71-2.71a.75.75 0 111.06-1.06l4 4a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Content */}
      <main 
        className={clsx(
          "flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 transition-all duration-700 ease-in-out",
          "bg-white lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950",
          isCollapsed ? "lg:pl-2" : "lg:pl-64"
        )}
      >
        <div className="grow lg:rounded-lg lg:bg-white lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10">
          {children}
        </div>
      </main>
    </div>
  )
}
