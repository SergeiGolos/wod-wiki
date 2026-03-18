import { useState, useEffect, useCallback, useMemo } from 'react'
import { UnifiedEditor } from '@/components/Editor/UnifiedEditor'
import { CommandPalette } from '@/components/playground/CommandPalette'
import { PLAYGROUND_CONTENT } from '@/constants/defaultContent'
import { 
  FileCode2, 
  Clock, 
  BarChart3, 
  ClipboardList, 
  ShieldCheck, 
  ChevronRight,
  Play,
  Zap,
  Cast,
  History,
  Lock,
  LineChart
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Constants ────────────────────────────────────────────────────────

const MINI_EXAMPLE_CONTENT = `:03 Countdown
  - [ ] 100m Row { distance: 100m }
  - 2x
    - 5 Burpees
    - 10 Air Squats`

const FEATURES = [
  {
    id: 'wodscript',
    icon: FileCode2,
    title: 'WodScript',
    description: 'Markdown with Mermaid-inspired syntax designed specifically for workout definitions.',
    detailedDescription: 'Stop struggling with complex apps. WodScript uses simple, readable markdown to define everything from basic sets to complex nested intervals. It is designed to be written as fast as you think.',
    example: `3x
  - 10 Kettlebell Swings (24kg)
  - 5 Burpees
  - 30s Rest`,
    image: 'https://placehold.co/600x400/1e293b/white?text=WodScript+Editor'
  },
  {
    id: 'clock',
    icon: Clock,
    title: 'Actionable Clock',
    description: 'From script to gym timer in one click. Support for Chromecast and smart lap tracking.',
    detailedDescription: 'The clock isn\'t just a timer; it\'s an execution engine. It understands your script, provides countdowns for transitions, and can even cast the display to your TV via Chromecast for hands-free visibility.',
    features: ['Chromecast Support', 'Smart Lap Tracking', 'Automatic Intervals', 'Voice Feedback'],
    image: 'https://placehold.co/600x400/1e293b/white?text=Actionable+Clock+UI'
  },
  {
    id: 'metrics',
    icon: BarChart3,
    title: 'Deep Metrics',
    description: 'Automatic performance insights and improvement tracking collected from every session.',
    detailedDescription: 'Every repetition and second is captured. WOD.WIKI automatically parses your results to provide volume tracking, heart rate zones (via integration), and movement-specific progression charts.',
    features: ['Volume Tracking', 'Intensity Analysis', 'Movement PRs', 'Rest Pattern Analysis'],
    image: 'https://placehold.co/600x400/1e293b/white?text=Performance+Analytics'
  },
  {
    id: 'reports',
    icon: ClipboardList,
    title: 'Custom Reports',
    description: 'Reflect on your fitness journey with detailed, customizable reports and summaries.',
    detailedDescription: 'Data is useless without reflection. Generate weekly, monthly, or yearly summaries that show you exactly where you are improving and where you might need to adjust your focus.',
    features: ['Weekly Summaries', 'Training Distribution', 'Recovery Insights', 'Export to PDF/JSON'],
    image: 'https://placehold.co/600x400/1e293b/white?text=Custom+Training+Reports'
  },
  {
    id: 'privacy',
    icon: ShieldCheck,
    title: 'Privacy First',
    description: 'All your data stays with you. No accounts, no tracking, just local-first storage.',
    detailedDescription: 'We don\'t want your data. All workout logs, metrics, and scripts are stored directly in your browser\'s local storage. Your fitness journey is your business, and yours alone.',
    features: ['100% Local Storage', 'No Account Required', 'No External Tracking', 'Easy Backups'],
    image: 'https://placehold.co/600x400/1e293b/white?text=Privacy+Architecture'
  }
]

// ── Components ───────────────────────────────────────────────────────

function TabsOverview({ actualTheme }: { actualTheme: string }) {
  const [activeTabId, setActiveTabId] = useState(FEATURES[0].id)
  
  const activeTab = useMemo(() => 
    FEATURES.find(f => f.id === activeTabId) || FEATURES[0]
  , [activeTabId])

  return (
    <div className="flex flex-col gap-10">
      {/* Centered Tabs Container */}
      <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-muted/50 rounded-2xl self-center border border-border/50">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          const isActive = activeTabId === feature.id
          return (
            <button
              key={feature.id}
              onClick={() => setActiveTabId(feature.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                isActive 
                  ? "bg-background text-primary shadow-md ring-1 ring-border/20" 
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {feature.title}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-6">
          <div className="space-y-4 text-center lg:text-left">
            <h3 className="text-3xl font-black tracking-tight text-foreground uppercase">
              {activeTab.title}
            </h3>
            <p className="text-lg text-muted-foreground font-medium leading-relaxed">
              {activeTab.detailedDescription}
            </p>
          </div>

          {activeTab.example && (
             activeTab.id === 'wodscript' ? (
                <div className="h-56 rounded-2xl overflow-hidden border border-border shadow-inner bg-background group relative">
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">Actionable</span>
                  </div>
                  <UnifiedEditor
                    key="tab-editor"
                    value={activeTab.example}
                    onChange={() => {}}
                    theme={actualTheme}
                    showLineNumbers={false}
                    enableOverlay={true}
                    className="h-full"
                  />
                </div>
             ) : (
               <div className="rounded-2xl bg-muted p-6 font-mono text-sm border border-border">
                 <pre className="text-foreground"><code>{activeTab.example}</code></pre>
               </div>
             )
          )}

          {activeTab.features && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeTab.features.map((f, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm font-bold text-foreground bg-muted/40 p-3 rounded-xl border border-border/50">
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Zap className="size-3 fill-current" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
          )}

          <div className="flex pt-4 justify-center lg:justify-start">
            <button className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary hover:underline group">
              View Documentation <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        <div className="relative group mx-auto w-full max-w-2xl lg:max-w-none">
          <div className="absolute -inset-4 bg-primary/10 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative rounded-[2rem] border border-border bg-card shadow-2xl overflow-hidden aspect-[4/3]">
            <img 
              src={activeTab.image} 
              alt={activeTab.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniExample({ actualTheme }: { actualTheme: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-6 lg:p-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-0.5 rounded-full bg-success/20 text-success text-[10px] font-black uppercase tracking-widest">
              Live Demo
            </div>
            <h3 className="text-2xl font-black tracking-tight text-foreground uppercase">Fast & Precise.</h3>
          </div>
          <p className="text-base text-muted-foreground font-medium leading-relaxed">
            Experience the workflow in seconds. This countdown block isn't just text—it's a live execution engine ready to track your session.
          </p>
          <div className="flex items-center gap-4 mt-6">
             <button 
                onClick={() => document.getElementById('full-editor')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary hover:underline"
              >
              Skip to full editor <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 min-w-0 max-w-xl w-full bg-background rounded-2xl border border-border shadow-2xl overflow-hidden ring-1 ring-primary/5">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-bottom border-border">
             <div className="flex gap-1.5">
                <div className="size-2.5 rounded-full bg-red-500/30" />
                <div className="size-2.5 rounded-full bg-amber-500/30" />
                <div className="size-2.5 rounded-full bg-emerald-500/30" />
             </div>
             <div className="flex-1 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">interactive-demo.wod</span>
             </div>
             <div className="size-5" />
          </div>
          <div className="h-72 overflow-hidden">
            <UnifiedEditor
              key="mini-example"
              value={MINI_EXAMPLE_CONTENT}
              onChange={() => {}}
              theme={actualTheme}
              showLineNumbers={false}
              enableOverlay={true}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── HomePageContent ───────────────────────────────────────────────────

export interface HomePageContentProps {
  actualTheme: string
  workoutItems: Array<{ id: string; name: string; category: string; content: string }>
  onSelectWorkout: (item: any) => void
  isCommandPaletteOpen: boolean
  setIsCommandPaletteOpen: (open: boolean) => void
  activeCategory: string | null
  setActiveCategory: (cat: string | null) => void
}

export function HomePageContent({
  actualTheme,
  workoutItems,
  onSelectWorkout,
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  activeCategory,
  setActiveCategory,
}: HomePageContentProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative px-6 py-20 lg:py-32 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 80%)',
          }}
        />
        
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-2xl shadow-primary/30 rotate-3 animate-in zoom-in duration-500">
              <Zap className="size-10 fill-current" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl font-black tracking-tighter sm:text-7xl lg:text-8xl text-foreground uppercase">
                WOD.WIKI
              </h1>
              <div className="space-y-2">
                <p className="text-xl font-black text-primary uppercase tracking-tight sm:text-2xl">
                  Master your Training.
                </p>
                <p className="mx-auto max-w-3xl text-lg font-medium text-muted-foreground sm:text-xl leading-relaxed">
                  A unified ecosystem for athletes who want <span className="text-foreground">precision, privacy, and performance insight</span> without the subscription — <span className="text-foreground">100% locally.</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 pt-6">
              <button 
                onClick={() => document.getElementById('mini-example')?.scrollIntoView({ behavior: 'smooth' })}
                className="group relative flex items-center gap-3 rounded-full bg-primary px-10 py-4 text-sm font-black uppercase tracking-widest text-primary-foreground transition-all hover:ring-4 hover:ring-primary/20 active:scale-95 shadow-lg shadow-primary/20"
              >
                <Play className="size-4 fill-current" />
                Try Interactive Demo
              </button>
              <button 
                onClick={() => document.getElementById('full-editor')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-3 rounded-full border border-border bg-card px-10 py-4 text-sm font-black uppercase tracking-widest text-foreground transition-all hover:bg-muted active:scale-95 border-b-4 hover:border-b-2"
              >
                Go to Full Editor
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Tabs Section */}
      <section className="px-6 py-16 lg:py-24 border-y border-border bg-muted/20">
        <div className="mx-auto max-w-6xl">
          <TabsOverview actualTheme={actualTheme} />
        </div>
      </section>

      {/* Mini Example */}
      <section id="mini-example" className="px-6 py-20 lg:py-36 bg-background">
        <div className="mx-auto max-w-6xl">
          <MiniExample actualTheme={actualTheme} />
        </div>
      </section>

      {/* Documentation / Links */}
      <section className="px-6 py-12 border-t border-border bg-muted/10">
        <div className="mx-auto max-w-6xl flex flex-wrap justify-center gap-x-16 gap-y-8 text-center">
          <a href="#" className="group flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Resources</span>
            <span className="text-base font-black text-foreground group-hover:underline">Detailed Syntax Guide</span>
          </a>
          <a href="#" className="group flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Library</span>
            <span className="text-base font-black text-foreground group-hover:underline">Example Collections</span>
          </a>
          <a href="#" className="group flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Help</span>
            <span className="text-base font-black text-foreground group-hover:underline">Getting Started</span>
          </a>
        </div>
      </section>

      {/* Full Editor */}
      <section id="full-editor" className="flex flex-1 flex-col min-h-[700px] border-t border-border">
        <div className="flex items-center justify-between px-6 py-3.5 bg-muted/40 border-b border-border">
           <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-primary animate-pulse" />
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Main Playground Editor</h2>
           </div>
           <div className="text-[10px] font-mono text-muted-foreground/40 font-bold uppercase tracking-tighter">
              Storage: Local IndexedDB // Persistence: Permanent
           </div>
        </div>
        <UnifiedEditor
          key="home"
          value={localStorage.getItem('playground-content') || PLAYGROUND_CONTENT}
          onChange={(val) => localStorage.setItem('playground-content', val)}
          className="flex-1 min-h-0 w-full"
          theme={actualTheme}
        />
      </section>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false)
          setActiveCategory(null)
        }}
        items={workoutItems}
        onSelect={onSelectWorkout}
        initialCategory={activeCategory}
      />
    </div>
  )
}
