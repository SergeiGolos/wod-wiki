import React, { useState, useEffect, useMemo } from 'react'
import { UnifiedEditor } from '@/components/Editor/UnifiedEditor'
import { useNavigate } from 'react-router-dom'
import { 
  Zap, 
  BookOpen, 
  Code2, 
  Play, 
  ChevronRight, 
  Plus,
  Trophy,
  Target,
  Rocket,
  Cast,
  ArrowUpRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CastCallout } from '@/components/cast/CastCallout'

// ── Data for Sections ────────────────────────────────────────────────

const BASICS_TABS = [
  {
    title: 'Headers & Text',
    subtitle: 'Structure your notes',
    content: `# My Training Session
Focusing on upper body strength today.
The goal is consistency over intensity.`
  },
  {
    title: 'Markdown Tables',
    subtitle: 'Organize equipment',
    content: `| Equipment | Weight | Notes |
|-----------|--------|-------|
| Kettlebell| 24kg   | Main  |
| Barbell   | 95lb   | Warmup|`
  },
  {
    title: 'Checklists',
    subtitle: 'Simple tracking',
    content: `## Prerequisites
- [x] Mobility work
- [ ] Fill water bottle
- [ ] Prep playlist`
  }
]

const BLOCKS_TABS = [
  {
    title: 'WOD Block',
    subtitle: 'The execution engine',
    content: '```wod\nTimer 10:00\n- 10 Pushups\n- 15 Air Squats\n```'
  },
  {
    title: 'Metadata',
    subtitle: 'JSON Configuration',
    content: '```json\n{\n  "difficulty": "Intermediate",\n  "tags": ["Full Body", "Kettlebell"],\n  "equipment": ["24kg KB"]\n}\n```'
  },
  {
    title: 'Smart Intervals',
    subtitle: 'Complex logic',
    content: '```wod\n4x\n- 40s Work\n- 20s Rest\n```'
  }
]

const NAV_LINKS = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'basics', label: 'Basics' },
  { id: 'blocks', label: 'Advanced Blocks' },
  { id: 'mastery', label: 'Final Steps' },
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
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-start lg:justify-center gap-2 sm:gap-6 overflow-x-auto py-4 no-scrollbar">
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
              "text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] whitespace-nowrap px-4 py-2 rounded-full transition-all",
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

function LessonSection({ 
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
    <div className="flex flex-col gap-3 w-full lg:w-1/4">
      {tabs.map((tab, idx) => (
        <button
          key={idx}
          onClick={() => setActiveIdx(idx)}
          className={cn(
            "text-left px-5 py-4 rounded-2xl transition-all border",
            activeIdx === idx 
              ? "bg-primary text-primary-foreground shadow-lg border-primary" 
              : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border-transparent hover:border-border"
          )}
        >
          <div className="text-sm font-black uppercase tracking-wider">{tab.title}</div>
          <div className="text-xs font-medium opacity-80 mt-1">{tab.subtitle}</div>
        </button>
      ))}
    </div>
  );

  const contentPanel = (
    <div className="w-full lg:w-3/4 bg-background rounded-3xl border border-border shadow-2xl overflow-hidden h-auto min-h-80 relative flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
         <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-red-500/20" />
            <div className="size-2.5 rounded-full bg-amber-500/20" />
            <div className="size-2.5 rounded-full bg-emerald-500/20" />
         </div>
         <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Interactive Lesson</span>
      </div>
      <div className="flex-1 relative">
        <UnifiedEditor
          key={`${id}-${activeIdx}`}
          noteId={`getting-started-${id}-${activeIdx}`}
          value={activeTab.content}
          onChange={() => {}}
          onCompleteWorkout={handleComplete}
          extendedResults={sessionResults}
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
    <section id={id} className="scroll-mt-24 py-20 lg:py-28 border-b border-border/50 odd:bg-background even:bg-muted/10">
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

export function GettingStartedPage({ theme }: { theme: string }) {
  const navigate = useNavigate()

  return (
    <div className="flex-1 overflow-y-auto bg-background flex flex-col min-h-0">
      {/* Hero Section */}
      <section id="introduction" className="relative px-6 py-20 lg:py-32 overflow-hidden scroll-mt-24">
        <CastCallout />
        
        <div
          className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 80%)',
          }}
        />
        
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="flex size-20 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/30 rotate-3">
              <Trophy className="size-10 fill-current" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl font-black tracking-tighter sm:text-7xl lg:text-8xl text-foreground uppercase">
                Zero to Hero
              </h1>
              <div className="space-y-2">
                <p className="text-xl font-black text-primary uppercase tracking-tight sm:text-2xl">
                  Master the Art of WodScript.
                </p>
                <p className="mx-auto max-w-3xl text-lg font-medium text-muted-foreground sm:text-xl leading-relaxed">
                  Go from absolute beginner to workout scripting expert. This interactive guide will teach you everything you need to know about <span className="text-foreground font-bold">WOD.WIKI</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StickyNav />

      <LessonSection 
        id="basics"
        title="1. The Basics"
        description="Every great workout starts with a clear plan. Learn how to use standard Markdown to structure your notes with headers, tables, and checklists."
        tabs={BASICS_TABS}
        align="left"
        actualTheme={theme}
      />

      <LessonSection 
        id="blocks"
        title="2. Advanced Blocks"
        description="The real power of WOD.WIKI lies in executable blocks. Use the WOD block for live timers and JSON for structured workout metadata."
        tabs={BLOCKS_TABS}
        align="right"
        actualTheme={theme}
      />

      <section id="mastery" className="scroll-mt-24 py-32 lg:py-48 bg-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        
        <div className="relative mx-auto max-w-4xl px-6 text-center z-10 space-y-12">
          <div className="flex justify-center">
            <div className="p-6 bg-background rounded-[2.5rem] border border-border shadow-2xl rotate-6">
              <Rocket className="size-16 text-primary" />
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-foreground uppercase">Ready for Hero status?</h2>
            <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
              You've mastered the syntax and the structure. Now it's time to create your own legacy. Build your first training playground and start your journey.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 pt-4">
            <button 
              onClick={() => navigate('/playground')}
              className="flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground text-sm font-black uppercase tracking-widest rounded-full shadow-2xl shadow-primary/30 transition-all hover:scale-[1.05] active:scale-95"
            >
              <Plus className="size-5" />
              Create First Playground
            </button>
            <button 
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 px-10 py-5 bg-background border border-border text-foreground text-sm font-black uppercase tracking-widest rounded-full transition-all hover:bg-muted active:scale-95"
            >
              Back to Start
            </button>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 flex flex-wrap justify-center gap-x-12 gap-y-6">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <Target className="size-4" />
            Objective: Elite Execution
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <BookOpen className="size-4" />
            Library: Local & Permanent
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <Code2 className="size-4" />
            Syntax: WodScript v0.5
          </div>
        </div>
      </footer>
    </div>
  )
}
