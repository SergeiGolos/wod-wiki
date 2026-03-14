import React, { useState, useMemo, useEffect } from 'react'
import { Avatar } from './Components/avatar'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from './Components/dropdown'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from './Components/navbar'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from './Components/sidebar'
import { SidebarLayout } from './Components/sidebar-layout'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog8ToothIcon,
  LightBulbIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
} from '@heroicons/react/16/solid'
import {
  Cog6ToothIcon,
  HomeIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  Square2StackIcon,
  TicketIcon,
  CodeBracketIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  RectangleStackIcon,
  BeakerIcon,
  CircleStackIcon,
  CommandLineIcon,
  DocumentTextIcon,
  FolderIcon,
} from '@heroicons/react/20/solid'

import { UnifiedEditor } from '@/components/Editor/UnifiedEditor'
import { PLAYGROUND_CONTENT } from '@/constants/defaultContent'
import { CommandPalette } from './Components/CommandPalette'
import { ThemeProvider, useTheme } from '@/components/theme/ThemeProvider'
import { CommandProvider } from '@/components/command-palette/CommandContext'
import { useCommandPalette } from '@/components/command-palette/CommandContext'
import { HashRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'

// Load all markdown files from the wod directory
const workoutFiles = import.meta.glob('../../wod/**/*.md', { eager: true, query: '?raw', import: 'default' })

interface WorkoutItem {
  id: string
  name: string
  category: string
  content: string
}

function AppContent() {
  const navigate = useNavigate()
  const { category: urlCategory, name: urlName } = useParams()
  const location = useLocation()
  
  const { isOpen: isCommandPaletteOpen, setIsOpen: setIsCommandPaletteOpen } = useCommandPalette()
  const { theme } = useTheme()
  const [recentPages, setRecentPages] = useState<string[]>(['Home'])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const workoutItems = useMemo(() => {
    return Object.entries(workoutFiles).map(([path, fileContent]) => {
      const parts = path.split('/')
      const fileName = parts[parts.length - 1].replace('.md', '')
      const category = parts[parts.length - 2] === 'wod' ? 'General' : parts[parts.length - 2]
      return {
        id: path,
        name: fileName,
        category: category,
        content: fileContent as string,
      }
    })
  }, [])

  // Find current content based on URL
  const currentWorkout = useMemo(() => {
    if (location.pathname === '/' || !urlName) {
      return { name: 'Home', content: PLAYGROUND_CONTENT, category: 'General' }
    }
    
    const name = decodeURIComponent(urlName)
    const category = urlCategory ? decodeURIComponent(urlCategory) : 'General'
    
    return workoutItems.find(item => item.name === name && item.category === category) || { name: 'Home', content: PLAYGROUND_CONTENT, category: 'General' }
  }, [urlCategory, urlName, workoutItems, location.pathname])

  const collections = useMemo(() => {
    const categories = Array.from(new Set(workoutItems.map(item => item.category)))
    
    const groups = {
      Kettlebell: [
        'kettlebell', 'dan-john', 'geoff-neupert', 'girevoy-sport', 
        'joe-daniels', 'keith-weber', 'mark-wildman', 'steve-cotter', 'strongfirst'
      ],
      Crossfit: [
        'crossfit-games', 'crossfit-girls'
      ],
      Swimming: [
        'pre-hishschool', 'highschool', 'college', 'post-college', 
        'masters', 'olympic', 'triathlete'
      ],
      Other: [
        'unconventional'
      ]
    }

    return {
      Kettlebell: groups.Kettlebell.filter(c => categories.includes(c)),
      Crossfit: groups.Crossfit.filter(c => categories.includes(c)),
      Swimming: groups.Swimming.filter(c => categories.includes(c)),
      Other: groups.Other.filter(c => categories.includes(c))
    }
  }, [workoutItems])

  // Update recent pages whenever currentWorkout changes
  useEffect(() => {
    setRecentPages(prev => {
      const filtered = prev.filter(name => name !== currentWorkout.name)
      return [currentWorkout.name, ...filtered].slice(0, 5)
    })
  }, [currentWorkout.name])

  const handleSelectWorkout = (item: WorkoutItem | { name: string; content: string; category?: string }) => {
    if (item.name === 'Home') {
      navigate('/')
    } else {
      const category = (item as WorkoutItem).category || 'General'
      navigate(`/workout/${encodeURIComponent(category)}/${encodeURIComponent(item.name)}`)
    }
  }

  const handleCollectionClick = (category: string) => {
    setActiveCategory(category)
    setIsCommandPaletteOpen(true)
  }

  const handleSearchClick = () => {
    setActiveCategory(null)
    setIsCommandPaletteOpen(true)
  }

  // Keyboard shortcut for command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'p') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setActiveCategory(null)
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [setIsCommandPaletteOpen])

  const actualTheme = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs'
    }
    return theme === 'dark' ? 'vs-dark' : 'vs'
  }, [theme])

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
          <NavbarSection>
            <NavbarItem onClick={handleSearchClick} aria-label="Search">
              <MagnifyingGlassIcon data-slot="icon" />
              <kbd className="ml-auto hidden font-sans text-xs text-zinc-400 group-data-[hover]:text-zinc-500 lg:inline dark:text-zinc-500 dark:group-data-[hover]:text-zinc-400">
                <abbr title="Control" className="no-underline">
                  Ctrl
                </abbr>{' '}
                K
              </kbd>
            </NavbarItem>
            <NavbarItem href="/inbox" aria-label="Inbox">
              <InboxIcon data-slot="icon" />
            </NavbarItem>
            <Dropdown>
              <DropdownButton as={NavbarItem}>
                <Avatar initials="S" square className="bg-zinc-500 text-white" />
              </DropdownButton>
              <DropdownMenu className="min-w-64" anchor="bottom end">
                <DropdownItem href="/my-profile">
                  <UserIcon data-slot="icon" />
                  <DropdownLabel>My profile</DropdownLabel>
                </DropdownItem>
                <DropdownItem href="/settings">
                  <Cog8ToothIcon data-slot="icon" />
                  <DropdownLabel>Settings</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem href="/privacy-policy">
                  <ShieldCheckIcon data-slot="icon" />
                  <DropdownLabel>Privacy policy</DropdownLabel>
                </DropdownItem>
                <DropdownItem href="/share-feedback">
                  <LightBulbIcon data-slot="icon" />
                  <DropdownLabel>Share feedback</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem href="/logout">
                  <ArrowRightStartOnRectangleIcon data-slot="icon" />
                  <DropdownLabel>Sign out</DropdownLabel>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center px-2 py-2.5">
              <Avatar initials="W" className="bg-blue-600 text-white size-6" />
              <span className="ml-3 text-sm font-semibold text-zinc-950 dark:text-white">Wod Wiki</span>
            </div>
            <SidebarSection>
              <SidebarItem onClick={() => navigate('/')} current={location.pathname === '/'}>
                <HomeIcon data-slot="icon" />
                <SidebarLabel>Home</SidebarLabel>
              </SidebarItem>
              <SidebarItem onClick={handleSearchClick}>
                <MagnifyingGlassIcon data-slot="icon" />
                <SidebarLabel>Search</SidebarLabel>
                <kbd className="ml-auto hidden font-sans text-xs text-zinc-400 group-data-[hover]:text-zinc-500 lg:inline dark:text-zinc-500 dark:group-data-[hover]:text-zinc-400">
                  <abbr title="Control" className="no-underline">
                    Ctrl
                  </abbr>{' '}
                  K
                </kbd>
              </SidebarItem>
            </SidebarSection>
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              <SidebarHeading>Syntax</SidebarHeading>
              <SidebarItem href="#/syntax/basics">
                <CodeBracketIcon data-slot="icon" />
                <SidebarLabel>The Basics</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="#/syntax/timers">
                <ClockIcon data-slot="icon" />
                <SidebarLabel>Timers & Intervals</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="#/syntax/repeaters">
                <ArrowsRightLeftIcon data-slot="icon" />
                <SidebarLabel>Repeaters</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="#/syntax/groups">
                <RectangleStackIcon data-slot="icon" />
                <SidebarLabel>Groups</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="#/syntax/measurements">
                <BeakerIcon data-slot="icon" />
                <SidebarLabel>Measurements</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="#/syntax/supplemental">
                <CircleStackIcon data-slot="icon" />
                <SidebarLabel>Supplemental Data</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="#/syntax/agentic">
                <CommandLineIcon data-slot="icon" />
                <SidebarLabel>Agentic Skill</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
            
            <SidebarSpacer />

            <SidebarSection>
              <SidebarHeading>Collections</SidebarHeading>
              {Object.entries(collections).map(([groupName, groupCategories]) => (
                groupCategories.length > 0 && (
                  <React.Fragment key={groupName}>
                    <div className="px-2 pt-4 pb-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                      {groupName}
                    </div>
                    {groupCategories.map(category => (
                      <SidebarItem key={category} onClick={() => handleCollectionClick(category)} current={currentWorkout.category === category}>
                        <FolderIcon data-slot="icon" />
                        <SidebarLabel>{category}</SidebarLabel>
                      </SidebarItem>
                    ))}
                  </React.Fragment>
                )
              ))}
            </SidebarSection>
            
            <SidebarSpacer />
            
            <SidebarSection>
              <SidebarHeading>Recent</SidebarHeading>
              {recentPages.map(pageName => {
                const item = workoutItems.find(i => i.name === pageName) || (pageName === 'Home' ? { name: 'Home', content: PLAYGROUND_CONTENT } : null)
                if (!item) return null
                return (
                  <SidebarItem key={pageName} onClick={() => handleSelectWorkout(item as any)} current={currentWorkout.name === pageName}>
                    {pageName}
                  </SidebarItem>
                )
              })}
            </SidebarSection>
          </SidebarBody>
          <SidebarFooter className="max-lg:hidden">
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar initials="S" className="size-10 bg-zinc-500 text-white" square alt="" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">Serge</span>
                    <span className="block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400">
                      serge@example.com
                    </span>
                  </span>
                </span>
                <ChevronUpIcon data-slot="icon" />
              </DropdownButton>
              <DropdownMenu className="min-w-64" anchor="top start">
                <DropdownItem href="/my-profile">
                  <UserIcon data-slot="icon" />
                  <DropdownLabel>My profile</DropdownLabel>
                </DropdownItem>
                <DropdownItem href="/settings">
                  <Cog8ToothIcon data-slot="icon" />
                  <DropdownLabel>Settings</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem href="/privacy-policy">
                  <ShieldCheckIcon data-slot="icon" />
                  <DropdownLabel>Privacy policy</DropdownLabel>
                </DropdownItem>
                <DropdownItem href="/share-feedback">
                  <LightBulbIcon data-slot="icon" />
                  <DropdownLabel>Share feedback</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem href="/logout">
                  <ArrowRightStartOnRectangleIcon data-slot="icon" />
                  <DropdownLabel>Sign out</DropdownLabel>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </SidebarFooter>
        </Sidebar>
      }
    >
      <div className="flex flex-col h-full min-h-[calc(100vh-theme(spacing.20))]">
        <div className="pt-4 lg:pt-6">
          <h1 className="px-6 lg:px-10 text-2xl/8 font-semibold text-zinc-950 sm:text-xl/8 dark:text-white">{currentWorkout.name}</h1>
          <hr role="presentation" className="mt-6 w-full border-t border-zinc-950/10 dark:border-white/10" />
        </div>
        
        <div className="flex-1 flex flex-col min-h-0">
          <UnifiedEditor
            key={currentWorkout.name}
            value={currentWorkout.content}
            onChange={() => {}} // Read-only for now via routing, or could sync back
            className="flex-1 min-h-0 w-full"
            theme={actualTheme}
          />
        </div>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false)
          setActiveCategory(null)
        }}
        items={workoutItems}
        onSelect={handleSelectWorkout}
        initialCategory={activeCategory}
      />
    </SidebarLayout>
  )
}

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="wod-wiki-playground-theme">
      <HashRouter>
        <CommandProvider>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="/workout/:category/:name" element={<AppContent />} />
            <Route path="*" element={<AppContent />} />
          </Routes>
        </CommandProvider>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App
