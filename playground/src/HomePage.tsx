import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UnifiedEditor } from '@/components/Editor/UnifiedEditor'
import { CommandPalette } from '@/components/playground/CommandPalette'
import { PLAYGROUND_CONTENT } from '@/constants/defaultContent'
import { 
  Zap,
  ShieldCheck,
  Server,
  Activity,
  Check,
  X,
  ClipboardList,
  ArrowRight,
  Keyboard,
  BookOpen,
  FileCode2,
  PenLine,
  PlayCircle,
  BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Data for Sections ────────────────────────────────────────────────

const WODSCRIPT_TABS = [
  {
    title: 'The Basics',
    subtitle: 'Simple sets and reps',
    content: `\`\`\`wod
(3) Rounds For Time
  - 10 Push-ups
  - 15 Air Squats
  - 20 Sit-ups
\`\`\``
  },
  {
    title: 'Complex Intervals',
    subtitle: 'Nested loops & rests',
    content: `\`\`\`wod
Timer 12:00
  - (4)
    - 40s Max Effort Rowing
    - 20s Rest
  - 2:00 Rest
  - (4)
    - 40s Burpees
    - 20s Rest
\`\`\``
  },
  {
    title: 'Loaded Movements',
    subtitle: 'Weights & checkboxes',
    content: `\`\`\`wod
5x
  - 5 Back Squats 225 lb
  - 10 Strict Pull-ups
  - [ ] 50m Heavy Sandbag Carry
\`\`\``
  }
]

const CLOCK_TABS = [
  {
    title: 'AMRAP',
    subtitle: 'As Many Reps As Possible',
    content: `\`\`\`wod
AMRAP 10:00
  - 5 Deadlifts 225 lb
  - 10 Box Jumps 24 in
\`\`\``
  },
  {
    title: 'EMOM',
    subtitle: 'Every Minute on the Minute',
    content: `\`\`\`wod
EMOM 10:00
  - 10 Kettlebell Swings 24 kg
\`\`\``
  },
  {
    title: 'Countdown Timer',
    subtitle: 'Precise transitions',
    content: `\`\`\`wod
:10 Countdown
  - Sprint 100m
\`\`\``
  }
]

const METRICS_TABS = [
  {
    title: 'Rep Tracking',
    subtitle: 'Volume accumulation',
    content: `\`\`\`wod
For Time
  - 100 Double Unders
  - 50 Thrusters 95 lb
\`\`\``
  },
  {
    title: 'Distance & Output',
    subtitle: 'Intensity tracking',
    content: `\`\`\`wod
Timer 20:00
  - 500m Row // intensity: 80%
  - 20 Wall Balls
  - 400m Run // intensity: 90%
\`\`\``
  }
]

const NAV_LINKS = [
  { id: 'learn', label: 'Learn' },
  { id: 'wodscript', label: 'WodScript' },
  { id: 'clock', label: 'Clock' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'reports', label: 'Reports' },
  { id: 'privacy', label: 'Privacy' },
]

// ── Components ───────────────────────────────────────────────────────

function StickyNav() {
  const [activeId, setActiveId] = useState('learn');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -50% 0px', threshold: [0, 0.5, 1.0] }
    );

    NAV_LINKS.forEach(link => {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border/50 shadow-sm transition-all">
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-start lg:justify-center gap-2 sm:gap-6 overflow-x-auto py-4 no-scrollbar scroll-smooth">
        {NAV_LINKS.map(link => (
          <a
            key={link.id}
            href={`#${link.id}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(link.id);
              if (el) {
                const y = el.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: y, behavior: 'smooth' });
              }
            }}
            className={cn(
              "text-[11px] sm:text-xs font-black uppercase tracking-[0.1em] whitespace-nowrap px-4 py-2 rounded-full transition-all ring-1 ring-transparent",
              activeId === link.id
                ? "bg-primary text-primary-foreground shadow-md ring-primary/20 scale-105"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:ring-border"
            )}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  )
}

function SideTabsSection({ 
  id, 
  title, 
  description, 
  tabs, 
  align = 'left', 
  actualTheme 
}: { 
  id: string, 
  title: string, 
  description: string, 
  tabs: any[], 
  align?: 'left' | 'right',
  actualTheme: string 
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeTab = tabs[activeIdx];

  const tabsPanel = (
    <div className="flex flex-col w-full lg:w-1/4 rounded-2xl border border-border/60 bg-card shadow-sm dark:shadow-none p-1.5 gap-0.5">
      {tabs.map((tab, idx) => (
        <button
          key={idx}
          onClick={() => setActiveIdx(idx)}
          className={cn(
            "text-left px-4 py-3.5 rounded-xl transition-all",
            activeIdx === idx 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <div className="text-sm font-black uppercase tracking-wider">{tab.title}</div>
          {tab.subtitle && <div className="text-xs font-medium opacity-70 mt-1">{tab.subtitle}</div>}
        </button>
      ))}
    </div>
  );

  const contentPanel = (
    <div className="w-full lg:w-3/4 bg-card rounded-3xl border border-border/70 shadow-md dark:shadow-none dark:ring-1 dark:ring-white/[0.06] overflow-hidden h-auto min-h-80 relative group flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/15 border-b border-border/60">
         <div className="flex gap-1.5">
            <div className="size-3 rounded-full bg-red-500/60" />
            <div className="size-3 rounded-full bg-amber-500/60" />
            <div className="size-3 rounded-full bg-emerald-500/60" />
         </div>
         <div className="flex gap-2 items-center">
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Live Preview</span>
         </div>
      </div>
      <div className="flex-1 relative">
        <UnifiedEditor
          key={`${id}-${activeIdx}`}
          value={activeTab.content}
          onChange={() => {}}
          theme={actualTheme}
          showLineNumbers={false}
          enableOverlay={true}
          enableInlineRuntime={true}
          className=""
        />
      </div>
    </div>
  );

  return (
    <section id={id} className="scroll-mt-24 py-20 lg:py-28 border-b border-border/50 odd:bg-background even:bg-muted/[0.18]">
      <div className="mx-auto max-w-6xl px-6">
        <div className={cn("mb-12 max-w-2xl", align === 'right' && "ml-auto text-right")}>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground uppercase">{title}</h2>
          <p className="mt-4 text-lg text-muted-foreground font-medium leading-relaxed">{description}</p>
        </div>
        <div className={cn("flex flex-col gap-8 lg:gap-12 items-center", align === 'left' ? "lg:flex-row" : "lg:flex-row-reverse")}>
          {tabsPanel}
          {contentPanel}
        </div>
      </div>
    </section>
  )
}

function PrivacySection() {
  return (
    <section id="privacy" className="scroll-mt-24 py-20 lg:py-32 border-b border-border/50 bg-background">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <ShieldCheck className="size-16 mx-auto mb-6 text-primary" />
          <h2 className="text-4xl font-black tracking-tight text-foreground uppercase">Privacy First. Local Always.</h2>
          <p className="mt-6 text-lg font-medium text-muted-foreground leading-relaxed">We don't want your data. All workout logs, metrics, and scripts are stored directly in your browser's local storage. Your fitness journey is your business, and yours alone.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mt-12">
           <div className="bg-card border border-success/30 rounded-[2rem] p-8 lg:p-10 relative overflow-hidden shadow-sm dark:shadow-none dark:ring-1 dark:ring-success/10">
              <h3 className="text-2xl font-black text-success flex items-center gap-3 mb-8 uppercase tracking-tight">
                 <Server className="size-6" /> What stays with you
              </h3>
              <ul className="space-y-5">
                 <li className="flex items-start gap-4"><Check className="size-6 text-success shrink-0"/> <span className="text-foreground font-medium text-lg">Workout Scripts & Notebooks</span></li>
                 <li className="flex items-start gap-4"><Check className="size-6 text-success shrink-0"/> <span className="text-foreground font-medium text-lg">Performance Logs & Metrics</span></li>
                 <li className="flex items-start gap-4"><Check className="size-6 text-success shrink-0"/> <span className="text-foreground font-medium text-lg">Custom Exercise Definitions</span></li>
                 <li className="flex items-start gap-4"><Check className="size-6 text-success shrink-0"/> <span className="text-foreground font-medium text-lg">Personal Settings & Preferences</span></li>
              </ul>
           </div>
           
           <div className="bg-card border border-destructive/30 rounded-[2rem] p-8 lg:p-10 relative overflow-hidden shadow-sm dark:shadow-none dark:ring-1 dark:ring-destructive/10">
              <h3 className="text-2xl font-black text-destructive flex items-center gap-3 mb-8 uppercase tracking-tight">
                 <Activity className="size-6" /> What is shared with us
              </h3>
              <ul className="space-y-5 text-muted-foreground">
                 <li className="flex items-start gap-4"><X className="size-6 text-destructive shrink-0"/> <span className="font-medium text-lg">Zero. Nothing. Nada.</span></li>
                 <li className="flex items-start gap-4"><X className="size-6 text-destructive shrink-0"/> <span className="font-medium text-lg">No accounts to create.</span></li>
                 <li className="flex items-start gap-4"><X className="size-6 text-destructive shrink-0"/> <span className="font-medium text-lg">No analytics tracking your behavior.</span></li>
                 <li className="flex items-start gap-4"><X className="size-6 text-destructive shrink-0"/> <span className="font-medium text-lg">No cloud sync sending data away.</span></li>
              </ul>
           </div>
        </div>
      </div>
    </section>
  )
}

function ReportsSection() {
  return (
    <section id="reports" className="scroll-mt-24 py-32 lg:py-48 border-b border-border/50 bg-muted/10 relative overflow-hidden">
       {/* Background placeholder */}
       <div className="absolute inset-0 bg-primary/5 opacity-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
       
       <div className="relative mx-auto max-w-4xl px-6 text-center z-10">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <ClipboardList className="size-20 text-muted-foreground/30" />
              <div className="absolute -top-2 -right-2 bg-background rounded-full p-1 border border-border shadow-sm">
                 <div className="size-3 bg-amber-500 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase opacity-50">Custom Reports</h2>
          <div className="mt-8 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black tracking-[0.2em] uppercase shadow-sm">
             Coming Soon
          </div>
          <p className="mt-8 text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
             Data is useless without reflection. We are building a comprehensive reporting engine to help you generate weekly, monthly, or yearly summaries that show you exactly where you are improving.
          </p>
       </div>
    </section>
  )
}

function GuideSection() {
  const navigate = useNavigate()
  return (
    <section id="learn" className="scroll-mt-24 py-16 lg:py-20 border-b border-border/50 bg-muted/[0.18]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground uppercase">Start Here</h2>
          <p className="mt-4 text-lg text-muted-foreground font-medium">New to WOD.WIKI? These two guides have everything you need.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/getting-started')}
            className="group flex flex-col items-start gap-4 p-8 rounded-3xl bg-card border border-border/60 shadow-sm hover:border-primary/40 hover:shadow-md transition-all text-left"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="size-6" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground uppercase">Zero to Hero</h3>
              <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">
                Interactive step-by-step lessons from your first statement to full workout programs.
              </p>
            </div>
            <div className="flex items-center gap-2 text-primary text-sm font-bold group-hover:gap-3 transition-all mt-auto">
              Start Learning <ArrowRight className="size-4" />
            </div>
          </button>
          <button
            onClick={() => navigate('/syntax')}
            className="group flex flex-col items-start gap-4 p-8 rounded-3xl bg-card border border-border/60 shadow-sm hover:border-primary/40 hover:shadow-md transition-all text-left"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileCode2 className="size-6" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground uppercase">Syntax Reference</h3>
              <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">
                The complete WodScript language reference with interactive examples for every fragment type.
              </p>
            </div>
            <div className="flex items-center gap-2 text-primary text-sm font-bold group-hover:gap-3 transition-all mt-auto">
              Browse Reference <ArrowRight className="size-4" />
            </div>
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Workflow Section ──────────────────────────────────────────────────

interface WorkflowStep {
  step: number
  icon: React.ComponentType<{ className?: string }>
  label: string
  title: string
  description: string
  badge: string
  badgeStyle: string
  iconColor: string
  iconBg: string
  dimmed: boolean
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: 1,
    icon: PenLine,
    label: 'Plan',
    title: 'Write Your Workout',
    description: 'Use WodScript in the editor to define reps, sets, timers, and metrics. Fast as you can think.',
    badge: 'Editor',
    badgeStyle: 'bg-blue-500/10 text-blue-500',
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
    dimmed: false,
  },
  {
    step: 2,
    icon: PlayCircle,
    label: 'Track',
    title: 'Fullscreen Timer',
    description: 'Hit Run. A fullscreen timer guides you through each block automatically — hands-free.',
    badge: '/tracker/:id',
    badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-500/10',
    dimmed: false,
  },
  {
    step: 3,
    icon: BarChart2,
    label: 'Review',
    title: 'Instant Summary',
    description: 'After completion, every segment, rep count, and elapsed time is saved and displayed automatically.',
    badge: '/review/:id',
    badgeStyle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-500/10',
    dimmed: false,
  },
  {
    step: 4,
    icon: ClipboardList,
    label: 'Report',
    title: 'Trends & Analytics',
    description: 'Weekly and monthly reports to track volume, intensity, and progression over time.',
    badge: 'Coming Soon',
    badgeStyle: 'bg-muted/60 text-muted-foreground',
    iconColor: 'text-muted-foreground/40',
    iconBg: 'bg-muted/30',
    dimmed: true,
  },
]

function WorkflowSection() {
  return (
    <section id="workflow" className="scroll-mt-24 py-20 lg:py-28 border-b border-border/50 bg-muted/[0.18]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground uppercase">The Workflow</h2>
          <p className="mt-4 text-lg text-muted-foreground font-medium leading-relaxed">
            Four views. One seamless flow from plan to performance insight.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WORKFLOW_STEPS.map((step, idx) => {
            const Icon = step.icon
            return (
              <div key={step.step} className="relative">
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-10 z-10 items-center justify-center">
                    <ArrowRight className="size-5 text-border" />
                  </div>
                )}
                <div className={cn(
                  "flex flex-col gap-4 p-6 rounded-3xl border border-border/60 h-full bg-card shadow-sm",
                  step.dimmed && "opacity-50"
                )}>
                  <div className="flex items-center justify-between">
                    <div className={cn("flex size-11 items-center justify-center rounded-xl", step.iconBg)}>
                      <Icon className={cn("size-5", step.iconColor)} />
                    </div>
                    <div className={cn("text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full font-mono", step.badgeStyle)}>
                      {step.badge}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground mb-1">
                      Step {step.step} · {step.label}
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Shortcuts Section ─────────────────────────────────────────────────

interface ShortcutDef {
  mac: string[]
  win: string[]
  description: string
}

const SHORTCUTS: ShortcutDef[] = [
  {
    mac: ['⌘', 'K'],
    win: ['Ctrl', 'K'],
    description: 'Open global search — find any workout in your library',
  },
  {
    mac: ['⌘', 'P'],
    win: ['Ctrl', 'P'],
    description: 'Command palette (same as ⌘K / Ctrl+K)',
  },
  {
    mac: ['⌘', '.'],
    win: ['Ctrl', '.'],
    description: 'Statement builder — insert a WodScript line interactively',
  },
  {
    mac: ['Esc'],
    win: ['Esc'],
    description: 'Close palette or overlay / cancel current action',
  },
]

function ShortcutsSection() {
  const [isMac, setIsMac] = useState(true)

  useEffect(() => {
    setIsMac(typeof navigator !== 'undefined' && /mac/i.test(navigator.platform))
  }, [])

  return (
    <section id="shortcuts" className="scroll-mt-24 py-20 lg:py-28 border-b border-border/50 bg-background">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          <div className="lg:w-72 shrink-0">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
              <Keyboard className="size-7" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground uppercase">Keyboard Shortcuts</h2>
            <p className="mt-4 text-base font-medium text-muted-foreground leading-relaxed">
              Designed for speed. Find, build, and run workouts without reaching for the mouse.
            </p>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setIsMac(true)}
                className={cn("text-xs font-bold px-3 py-1.5 rounded-lg transition-colors", isMac ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}
              >
                macOS
              </button>
              <button
                onClick={() => setIsMac(false)}
                className={cn("text-xs font-bold px-3 py-1.5 rounded-lg transition-colors", !isMac ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}
              >
                Windows / Linux
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-3 w-full">
            {SHORTCUTS.map((shortcut, idx) => (
              <div key={idx} className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border/60 shadow-sm">
                <div className="flex items-center gap-1.5 shrink-0 min-w-[90px]">
                  {(isMac ? shortcut.mac : shortcut.win).map((key, ki) => (
                    <span
                      key={ki}
                      className="inline-flex items-center justify-center min-w-[36px] px-2 py-1.5 text-[11px] font-black tracking-wide bg-muted border border-border rounded-lg font-mono shadow-[0_2px_0_0_var(--border)] uppercase"
                    >
                      {key}
                    </span>
                  ))}
                </div>
                <p className="text-sm font-medium text-foreground">{shortcut.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
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
      <section className="relative px-6 pt-24 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 80%)',
          }}
        />
        
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="flex size-24 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/30 rotate-3 animate-in zoom-in duration-500">
              <Zap className="size-12 fill-current" />
            </div>
            
            <div className="space-y-6">
              <h1 className="text-6xl font-black tracking-tighter sm:text-8xl lg:text-9xl text-foreground uppercase drop-shadow-sm">
                WOD.WIKI
              </h1>
              <div className="space-y-4">
                <p className="text-2xl font-black text-primary uppercase tracking-tight sm:text-3xl">
                  Master your Training.
                </p>
                <p className="mx-auto max-w-3xl text-lg font-medium text-muted-foreground sm:text-xl leading-relaxed">
                  A unified ecosystem for athletes who want <span className="text-foreground">precision, privacy, and performance insight</span> without the subscription — <span className="text-foreground">100% locally.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Navigation */}
      <StickyNav />

      {/* Guide Links */}
      <GuideSection />

      {/* Feature Sections */}
      <SideTabsSection 
        id="wodscript"
        title="WodScript"
        description="Markdown with Mermaid-inspired syntax designed specifically for workout definitions. Stop struggling with complex apps; write as fast as you think."
        tabs={WODSCRIPT_TABS}
        align="left"
        actualTheme={actualTheme}
      />

      <SideTabsSection 
        id="clock"
        title="Actionable Clock"
        description="The clock isn't just a timer; it's an execution engine. It understands your script, provides countdowns for transitions, and casts to your TV."
        tabs={CLOCK_TABS}
        align="right"
        actualTheme={actualTheme}
      />

      <SideTabsSection 
        id="metrics"
        title="Deep Metrics"
        description="Every repetition and second is captured. WOD.WIKI automatically parses your results to provide volume tracking and progression charts."
        tabs={METRICS_TABS}
        align="left"
        actualTheme={actualTheme}
      />

      <WorkflowSection />

      <ReportsSection />
      
      {/* Keyboard Shortcuts */}
      <ShortcutsSection />

      <PrivacySection />

      {/* Main Playground Editor (Always at bottom for quick access) */}
      <section id="full-editor" className="flex flex-1 flex-col min-h-[700px] border-t border-border">
        <div className="flex items-center justify-between px-6 py-4 bg-muted/40 border-b border-border">
           <div className="flex items-center gap-3">
              <div className="size-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" />
              <h2 className="text-xs font-black uppercase tracking-[0.15em] text-foreground">Main Playground</h2>
           </div>
           <div className="text-[10px] font-mono text-muted-foreground font-bold uppercase tracking-tighter bg-muted/50 px-3 py-1.5 rounded-md border border-border/50">
              Storage: Local IndexedDB // Persistence: Active
           </div>
        </div>
        <UnifiedEditor
          key="home-playground"
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
