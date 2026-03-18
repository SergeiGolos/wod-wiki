import React, { useState, useEffect } from 'react'
import { UnifiedEditor } from '@/components/Editor/UnifiedEditor'
import { useNavigate } from 'react-router-dom'
import { 
  Code2, 
  Clock, 
  RotateCcw, 
  Layers, 
  Scale, 
  PlusCircle, 
  Terminal,
  ChevronRight,
  BookOpen,
  Cpu
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Data for Sections ────────────────────────────────────────────────

const BASICS_TABS = [
  {
    title: 'The WOD Block',
    subtitle: 'Code fences',
    content: '```wod\nPushups\nSitups\nSquats\n```'
  },
  {
    title: 'Simple Lists',
    subtitle: 'One per line',
    content: '```wod\n10 Burpees\n20 Air Squats\n30 Situps\n```'
  }
]

const TIMERS_TABS = [
  {
    title: 'AMRAP',
    subtitle: 'Down timer',
    content: '```wod\n20:00 (AMRAP)\n  5 Pullups\n  10 Pushups\n  15 Squats\n```'
  },
  {
    title: 'EMOM',
    subtitle: 'Interval timer',
    content: '```wod\n10:00 (EMOM)\n  3 Clean & Jerk\n```'
  },
  {
    title: 'Tabata',
    subtitle: 'Work/Rest loops',
    content: '```wod\n(8 Rounds)\n  :20 Work\n  :10 Rest\n  Air Squats\n```'
  }
]

const REPEATERS_TABS = [
  {
    title: 'Rep Schemes',
    subtitle: 'Descending reps',
    content: '```wod\n(21-15-9)\n  Thrusters 95lb\n  Pullups\n```'
  },
  {
    title: 'Sets',
    subtitle: 'Simple volume',
    content: '```wod\n(5 Sets)\n  10 Deadlift 225lb\n  1:00 Rest\n```'
  }
]

const GROUPS_TABS = [
  {
    title: 'Simple Rounds',
    subtitle: 'Grouping movements',
    content: '```wod\n(3 Rounds)\n  10 Pushups\n  10 Situps\n```'
  },
  {
    title: 'Nested Loops',
    subtitle: 'Complex structure',
    content: '```wod\n(3 Rounds)\n  (Tabata)\n    :20 Work\n    :10 Rest\n    Air Squats\n  1:00 Rest\n```'
  }
]

const MEASUREMENTS_TABS = [
  {
    title: 'Weights',
    subtitle: 'lb, kg, bw',
    content: '```wod\nBack Squat 225lb\nDeadlift 100kg\nWeighted Pullup 20lb\nAir Squat bw\n```'
  },
  {
    title: 'Distance',
    subtitle: 'm, km, ft, miles',
    content: '```wod\nRun 400m\nRow 2000m\nBike 10 miles\nSwim 500m\n```'
  }
]

const SUPPLEMENTAL_TABS = [
  {
    title: 'Actions & Rest',
    subtitle: 'Non-movement steps',
    content: '```wod\n5 Rounds\n  Run 400m\n  2:00 Rest\n  Setup Barbell\n```'
  },
  {
    title: 'Uncertainty',
    subtitle: 'Increasing load',
    content: '```wod\n5 Deadlift ?lb\n```'
  }
]

const AGENTIC_TABS = [
  {
    title: 'LLM Extraction',
    subtitle: 'Natural language',
    content: '```wod\n// Send your whiteboard photo to the LLM\n// and get back valid WodScript syntax.\n```'
  }
]

const NAV_LINKS = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'basics', label: 'Basics' },
  { id: 'timers', label: 'Timers' },
  { id: 'repeaters', label: 'Repeaters' },
  { id: 'groups', label: 'Groups' },
  { id: 'measurements', label: 'Measurements' },
  { id: 'supplemental', label: 'Supplemental' },
  { id: 'agentic', label: 'Agentic' },
]

// ── Components ───────────────────────────────────────────────────────

function StickyNav() {
  const [activeId, setActiveId] = useState('introduction');

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
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-start lg:justify-center gap-2 sm:gap-4 overflow-x-auto py-4 no-scrollbar">
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
              "text-[9px] sm:text-xs font-black uppercase tracking-[0.1em] whitespace-nowrap px-3 py-1.5 rounded-full transition-all",
              activeId === link.id 
                ? "bg-primary text-primary-foreground shadow-md scale-105" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  )
}

function SyntaxSection({ 
  id, 
  title, 
  description, 
  tabs, 
  align = 'left', 
  actualTheme,
  icon: Icon
}: { 
  id: string, 
  title: string, 
  description: string, 
  tabs: any[], 
  align?: 'left' | 'right',
  actualTheme: string,
  icon: any
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [sessionResults, setSessionResults] = useState<any[]>([]);
  const activeTab = tabs[activeIdx];

  const handleComplete = (blockId: string, data: any) => {
    const result = {
      id: Math.random().toString(36).substring(7),
      sectionId: blockId,
      segmentId: blockId,
      data,
      completedAt: Date.now()
    };
    setSessionResults(prev => [result, ...prev]);
  };

  const tabsPanel = (
    <div className="flex flex-col gap-2 w-full lg:w-1/4">
      {tabs.map((tab, idx) => (
        <button
          key={idx}
          onClick={() => setActiveIdx(idx)}
          className={cn(
            "text-left px-4 py-3 rounded-xl transition-all border",
            activeIdx === idx 
              ? "bg-primary text-primary-foreground shadow-lg border-primary" 
              : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border-transparent hover:border-border"
          )}
        >
          <div className="text-xs font-black uppercase tracking-wider">{tab.title}</div>
          <div className="text-[10px] font-medium opacity-80 mt-0.5">{tab.subtitle}</div>
        </button>
      ))}
    </div>
  );

  const contentPanel = (
    <div className="w-full lg:w-3/4 bg-background rounded-2xl border border-border shadow-xl overflow-hidden h-72 relative flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
         <div className="flex gap-1.5">
            <div className="size-2 rounded-full bg-red-500/20" />
            <div className="size-2 rounded-full bg-amber-500/20" />
            <div className="size-2 rounded-full bg-emerald-500/20" />
         </div>
         <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">WodScript v0.5</span>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <UnifiedEditor
          key={`${id}-${activeIdx}`}
          noteId={`syntax-${id}-${activeIdx}`}
          value={activeTab.content}
          onChange={() => {}}
          onCompleteWorkout={handleComplete}
          extendedResults={sessionResults}
          theme={actualTheme}
          showLineNumbers={false}
          enableOverlay={true}
          enableInlineRuntime={true}
          className="h-full text-sm"
        />
      </div>
    </div>
  );

  return (
    <section id={id} className="scroll-mt-24 py-16 lg:py-20 border-b border-border/50 odd:bg-background even:bg-muted/10">
      <div className="mx-auto max-w-6xl px-6">
        <div className={cn("mb-10 max-w-2xl", align === 'right' && "ml-auto text-right")}>
          <div className={cn("flex items-center gap-3 mb-4", align === 'right' && "justify-end")}>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icon size={20} />
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase">{title}</h2>
          </div>
          <p className="text-base text-muted-foreground font-medium leading-relaxed">{description}</p>
        </div>
        <div className={cn("flex flex-col gap-6 lg:gap-10 items-center", align === 'left' ? "lg:flex-row" : "lg:flex-row-reverse")}>
          {tabsPanel}
          {contentPanel}
        </div>
      </div>
    </section>
  )
}

export function SyntaxPage({ theme }: { theme: string }) {
  const navigate = useNavigate()

  return (
    <div className="flex-1 overflow-y-auto bg-background flex flex-col min-h-0">
      {/* Hero Section */}
      <section id="introduction" className="relative px-6 py-16 lg:py-24 overflow-hidden scroll-mt-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 80%)',
          }}
        />
        
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="flex size-16 items-center justify-center rounded-[1.5rem] bg-primary text-primary-foreground shadow-xl shadow-primary/30 rotate-3">
              <Code2 className="size-8 fill-current" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tighter sm:text-6xl lg:text-7xl text-foreground uppercase">
                WodScript Syntax
              </h1>
              <div className="space-y-2">
                <p className="text-lg font-black text-primary uppercase tracking-tight sm:text-xl">
                  The Language of Effort.
                </p>
                <p className="mx-auto max-w-3xl text-base font-medium text-muted-foreground sm:text-lg leading-relaxed">
                  A comprehensive guide to every command, timer, and repeater in the <span className="text-foreground font-bold">WodScript</span> ecosystem. Designed for speed, precision, and readability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StickyNav />

      <SyntaxSection 
        id="basics"
        title="The Basics"
        description="Learn the fundamental structure of a WodScript block, from basic code fences to simple movement lists."
        tabs={BASICS_TABS}
        align="left"
        actualTheme={theme}
        icon={BookOpen}
      />

      <SyntaxSection 
        id="timers"
        title="Timers & Intervals"
        description="Master time-cap workouts (AMRAP), interval training (EMOM), and precise work/rest ratios like Tabata."
        tabs={TIMERS_TABS}
        align="right"
        actualTheme={theme}
        icon={Clock}
      />

      <SyntaxSection 
        id="repeaters"
        title="Repeaters"
        description="Define rep schemes like 21-15-9 or simple set structures with minimal syntax overhead."
        tabs={REPEATERS_TABS}
        align="left"
        actualTheme={theme}
        icon={RotateCcw}
      />

      <SyntaxSection 
        id="groups"
        title="Groups & Nesting"
        description="Organize your workouts into rounds, named sections, and complex nested structures using parentheses."
        tabs={GROUPS_TABS}
        align="right"
        actualTheme={theme}
        icon={Layers}
      />

      <SyntaxSection 
        id="measurements"
        title="Measurements"
        description="Capture weights in lb or kg, and track distances across all standard units like meters, miles, and feet."
        tabs={MEASUREMENTS_TABS}
        align="left"
        actualTheme={theme}
        icon={Scale}
      />

      <SyntaxSection 
        id="supplemental"
        title="Supplemental Data"
        description="Log rest periods, auxiliary setup actions, and handle uncertainty in your training with specialized markers."
        tabs={SUPPLEMENTAL_TABS}
        align="right"
        actualTheme={theme}
        icon={PlusCircle}
      />

      <SyntaxSection 
        id="agentic"
        title="Agentic Skill"
        description="Learn how Large Language Models can use WodScript to transform your training ideas into executable code automatically."
        tabs={AGENTIC_TABS}
        align="left"
        actualTheme={theme}
        icon={Cpu}
      />

      <section id="cta" className="py-20 bg-muted/20 text-center">
        <div className="mx-auto max-w-4xl px-6 space-y-8">
          <Terminal className="size-12 mx-auto text-primary opacity-50" />
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground uppercase italic">Ready to script?</h2>
          <button 
            onClick={() => navigate('/playground')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground text-sm font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/30 transition-all hover:scale-[1.05] active:scale-95"
          >
            Start New Playground
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <footer className="py-10 border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 flex flex-wrap justify-center gap-x-12 gap-y-4">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Code2 size={12} /> WodScript v0.5.0
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Target size={12} /> Syntax Documentation
          </div>
        </div>
      </footer>
    </div>
  )
}

function Target({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
