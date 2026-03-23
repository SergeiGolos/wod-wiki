import React, { useState, useEffect } from 'react'
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { useNavigate } from 'react-router-dom'
import {
  Code2,
  Plus,
  Trophy,
  Rocket,
  Clock,
  BarChart2,
  Layers,
  Zap,
  FileText,
  Target,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CastCallout } from '@/components/cast/CastCallout'
import { getTabExamples } from '@/repositories/page-examples'

// ── Data for Sections (loaded from wod/examples/getting-started/) ─────

const STATEMENT_TABS = getTabExamples('getting-started', 'statement')
const TIMER_TABS     = getTabExamples('getting-started', 'timer')
const METRICS_TABS   = getTabExamples('getting-started', 'metrics')
const GROUPS_TABS    = getTabExamples('getting-started', 'groups')
const PROTOCOLS_TABS = getTabExamples('getting-started', 'protocols')
const NOTEBOOK_TABS  = getTabExamples('getting-started', 'notebook')

const NAV_LINKS = [
  { id: 'introduction', label: 'Intro' },
  { id: 'statement', label: 'First Statement' },
  { id: 'timer', label: 'Timers' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'groups', label: 'Groups' },
  { id: 'protocols', label: 'Protocols' },
  { id: 'notebook', label: 'Notebook' },
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
          <div className="text-xs font-medium opacity-70 mt-1">{tab.subtitle}</div>
        </button>
      ))}
    </div>
  );

  const contentPanel = (
    <div className="w-full lg:w-3/4 bg-card rounded-3xl border border-border/70 shadow-md dark:shadow-none dark:ring-1 dark:ring-white/[0.06] overflow-hidden h-auto min-h-80 relative flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/15 border-b border-border/60">
         <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-red-500/60" />
            <div className="size-2.5 rounded-full bg-amber-500/60" />
            <div className="size-2.5 rounded-full bg-emerald-500/60" />
         </div>
         <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Interactive Lesson</span>
      </div>
      <div className="flex-1 relative">
        <NoteEditor
          key={`${id}-${activeIdx}`}
          noteId={`getting-started-${id}-${activeIdx}`}
          value={activeTab.content}
          onChange={() => {}}
          onCompleteWorkout={handleComplete}
          extendedResults={sessionResults}
          theme={actualTheme}
          showLineNumbers={false}
          enableOverlay={false}
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

export function GettingStartedPage({ theme }: { theme: string }) {
  const navigate = useNavigate()

  return (
    <div className="flex-1 overflow-y-auto bg-background flex flex-col min-h-0">
      {/* Hero Section */}
      <section id="introduction" className="relative px-6 pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden scroll-mt-24">
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
                  Learn WodScript from the inside out.
                </p>
                <p className="mx-auto max-w-3xl text-lg font-medium text-muted-foreground sm:text-xl leading-relaxed">
                  Start with a single line. Build to full workout protocols. Then discover the notebook layer that holds it all together.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StickyNav />

      <LessonSection
        id="statement"
        title="1. Your First Statement"
        description="Every line inside a wod block is a statement. Statements are made of fragments — the smallest units of workout meaning. Start simple: just move."
        tabs={STATEMENT_TABS}
        align="left"
        actualTheme={theme}
      />

      <LessonSection
        id="timer"
        title="2. Adding a Timer"
        description="Attach a duration to any statement to add a timer. The format determines direction: an explicit time counts down, while ^ forces count-up. Use :? to record however long something actually takes."
        tabs={TIMER_TABS}
        align="right"
        actualTheme={theme}
      />

      <LessonSection
        id="metrics"
        title="3. Measuring Your Work"
        description="Quantify effort with reps, weight, and distance. Use ?lb or ?kg when you want the runner to set their own load at runtime — great for strength blocks."
        tabs={METRICS_TABS}
        align="left"
        actualTheme={theme}
      />

      <LessonSection
        id="groups"
        title="4. Groups & Rounds"
        description="Wrap statements in parentheses to repeat them. Use a single number for simple rounds, a dash-separated sequence for rep schemes like 21-15-9, or nest groups inside each other for complex protocols."
        tabs={GROUPS_TABS}
        align="right"
        actualTheme={theme}
      />

      <LessonSection
        id="protocols"
        title="5. Workout Protocols"
        description="WodScript recognizes classic CrossFit-style protocols by keyword. AMRAP runs unbounded rounds against a countdown. EMOM fires an interval every minute. FOR TIME runs a stopwatch to completion. Tabata uses preset 20s/10s intervals."
        tabs={PROTOCOLS_TABS}
        align="left"
        actualTheme={theme}
      />

      <LessonSection
        id="notebook"
        title="6. It's a Notebook"
        description="WodScript lives inside a Markdown document. Everything outside a wod block is standard Markdown — headers, notes, checklists, tables. Use it to structure a full training session, add coach notes, or track multiple workouts in one file."
        tabs={NOTEBOOK_TABS}
        align="right"
        actualTheme={theme}
      />

      {/* CTA Section */}
      <section className="scroll-mt-24 py-32 lg:py-48 bg-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-4xl px-6 text-center z-10 space-y-12">
          <div className="flex justify-center">
            <div className="p-6 bg-background rounded-[2.5rem] border border-border shadow-2xl rotate-6">
              <Rocket className="size-16 text-primary" />
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-foreground uppercase">Ready to Build?</h2>
            <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
              You know the language. Now write your own workouts, run them live, and build a training library that's entirely yours.
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
              onClick={() => navigate('/syntax')}
              className="flex items-center gap-3 px-10 py-5 bg-background border border-border text-foreground text-sm font-black uppercase tracking-widest rounded-full transition-all hover:bg-muted active:scale-95"
            >
              <BookOpen className="size-5" />
              View Syntax Reference
            </button>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 flex flex-wrap justify-center gap-x-12 gap-y-6">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <Target size={12} />
            Inside-Out Learning
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <BookOpen size={12} />
            6 Progressive Levels
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <Code2 size={12} />
            WodScript v0.5
          </div>
        </div>
      </footer>
    </div>
  )
}
