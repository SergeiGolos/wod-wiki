import React, { useState, useEffect } from 'react'
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { useNavigate } from 'react-router-dom'
import {
  Code2,
  Clock,
  Layers,
  Terminal,
  ChevronRight,
  BookOpen,
  BarChart2,
  Zap,
  PlusCircle,
  FileText,
  ScanLine,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CastCallout } from '@/components/cast/CastCallout'
import { getTabExamples } from '@/repositories/page-examples'

// ── Fragment Anatomy Data ─────────────────────────────────────────────

const FRAGMENT_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  rep:      { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-600 dark:text-blue-400',   label: 'Quantity (rep)' },
  weight:   { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600 dark:text-orange-400', label: 'Quantity (weight)' },
  distance: { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-600 dark:text-green-400',  label: 'Quantity (distance)' },
  effort:   { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-600 dark:text-purple-400', label: 'Effort' },
  duration: { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-600 dark:text-red-400',    label: 'Duration' },
  rounds:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', label: 'Rounds' },
  action:   { bg: 'bg-slate-500/10',  border: 'border-slate-500/30',  text: 'text-slate-600 dark:text-slate-400',  label: 'Action' },
  rest:     { bg: 'bg-teal-500/10',   border: 'border-teal-500/30',   text: 'text-teal-600 dark:text-teal-400',   label: 'Rest (duration)' },
  comment:  { bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   text: 'text-gray-500 dark:text-gray-400',   label: 'Comment' },
}

const ANATOMY_EXAMPLES = [
  {
    line: '10 Thrusters 95lb',
    fragments: [
      { token: '10',        type: 'rep',    note: 'Rep count' },
      { token: 'Thrusters', type: 'effort', note: 'Movement name' },
      { token: '95lb',      type: 'weight', note: 'Load in pounds' },
    ],
    summary: 'Ten thrusters at 95 lb. No timer means stopwatch mode — clock runs up until you complete the reps.',
  },
  {
    line: '5:00 Run',
    fragments: [
      { token: '5:00', type: 'duration', note: 'Countdown timer' },
      { token: 'Run',  type: 'effort',   note: 'Movement name' },
    ],
    summary: 'Run with a 5-minute countdown. The timer counts down to zero then the block ends.',
  },
  {
    line: '^5:00 Row',
    fragments: [
      { token: '^5:00', type: 'duration', note: 'Count-up (^ prefix)' },
      { token: 'Row',   type: 'effort',   note: 'Movement name' },
    ],
    summary: 'Row with a count-up reference clock. ^ overrides the default countdown direction — useful for pacing.',
  },
  {
    line: ':? Max Effort Pushups',
    fragments: [
      { token: ':?',              type: 'duration', note: 'Collectible timer' },
      { token: 'Max Effort Pushups', type: 'effort', note: 'Movement name' },
    ],
    summary: ':? records however long the effort actually takes. Use it to log real times without setting a target.',
  },
  {
    line: '(21-15-9)',
    fragments: [
      { token: '(21-15-9)', type: 'rounds', note: '3-round rep sequence' },
    ],
    summary: 'Three rounds with decreasing rep targets: 21 reps first, then 15, then 9. Add child movements below.',
  },
  {
    line: '[Setup Barbell]',
    fragments: [
      { token: '[Setup Barbell]', type: 'action', note: 'Non-movement checkpoint' },
    ],
    summary: 'An action prompt — appears in the plan and execution view but tracks neither reps nor time.',
  },
  {
    line: '// Stay tight on the descent',
    fragments: [
      { token: '// Stay tight on the descent', type: 'comment', note: 'Inline annotation' },
    ],
    summary: 'Text comments are visible in the editor but hidden from the execution overlay. Use for coach cues.',
  },
]

// ── Section Data (loaded from markdown/canvas/syntax/) ──────────────────

const TIMERS_TABS      = getTabExamples('syntax', 'timers')
const METRICS_TABS     = getTabExamples('syntax', 'metrics')
const GROUPS_TABS      = getTabExamples('syntax', 'groups')
const PROTOCOLS_TABS   = getTabExamples('syntax', 'protocols')
const SUPPLEMENTAL_TABS = getTabExamples('syntax', 'supplemental')
const DOCUMENT_TABS    = getTabExamples('syntax', 'document')


const NAV_LINKS = [
  { id: 'introduction', label: 'Intro' },
  { id: 'anatomy',     label: 'Anatomy' },
  { id: 'timers',      label: 'Timers' },
  { id: 'metrics',     label: 'Metrics' },
  { id: 'groups',      label: 'Groups' },
  { id: 'protocols',   label: 'Protocols' },
  { id: 'supplemental', label: 'Supplemental' },
  { id: 'document',    label: 'Document' },
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
        <NoteEditor
          key={`${id}-${activeIdx}`}
          noteId={`syntax-${id}-${activeIdx}`}
          value={activeTab.content}
          onChange={() => {}}
          onCompleteWorkout={handleComplete}
          extendedResults={sessionResults}
          theme={actualTheme}
          showLineNumbers={false}
          enableOverlay={false}
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

function StatementAnatomySection({ id }: { id: string }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const example = ANATOMY_EXAMPLES[activeIdx]

  return (
    <section id={id} className="scroll-mt-24 py-16 lg:py-20 border-b border-border/50 bg-background">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ScanLine size={20} />
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase">Statement Anatomy</h2>
          </div>
          <p className="text-base text-muted-foreground font-medium leading-relaxed">
            Every line in a <code className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded text-sm">wod</code> block is a <strong>statement</strong> — a sequence of typed fragments. Select an example below to see how each token is classified.
          </p>
        </div>

        {/* Example picker */}
        <div className="flex flex-wrap gap-2 mb-8">
          {ANATOMY_EXAMPLES.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border',
                activeIdx === idx
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              )}
            >
              {ex.line}
            </button>
          ))}
        </div>

        {/* Anatomy diagram */}
        <div className="bg-card rounded-2xl border border-border p-6 lg:p-8 shadow-md">
          <div className="font-mono text-sm text-muted-foreground mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest mr-3">Input</span>
            <span className="text-foreground font-bold">{example.line}</span>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            {example.fragments.map((frag, idx) => {
              const style = FRAGMENT_STYLES[frag.type]
              return (
                <div
                  key={idx}
                  className={cn(
                    'flex flex-col items-center rounded-xl border-2 p-4 min-w-[120px] transition-all',
                    style.bg,
                    style.border
                  )}
                >
                  <div className={cn('text-[9px] font-black uppercase tracking-widest mb-2', style.text)}>
                    {style.label}
                  </div>
                  <div className="font-mono text-lg font-bold text-foreground text-center break-all">
                    {frag.token}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2 text-center">
                    {frag.note}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-sm text-muted-foreground italic border-t border-border pt-4">
            {example.summary}
          </p>
        </div>

        {/* Fragment type legend */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Object.entries(FRAGMENT_STYLES).map(([type, style]) => (
            <div key={type} className={cn('rounded-lg px-3 py-2 flex items-center gap-2 border', style.bg, style.border)}>
              <span className={cn('text-[10px] font-black uppercase tracking-wide', style.text)}>{style.label}</span>
            </div>
          ))}
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
      <section id="introduction" className="relative px-6 pt-32 pb-16 lg:pt-48 lg:pb-24 overflow-hidden scroll-mt-24">
        <CastCallout />
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
                  The Complete Language Reference.
                </p>
                <p className="mx-auto max-w-3xl text-base font-medium text-muted-foreground sm:text-lg leading-relaxed">
                  Every token. Every modifier. Every protocol. A structured reference for authoring precise, executable workout scripts in <span className="text-foreground font-bold">WOD.WIKI</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StickyNav />

      <StatementAnatomySection id="anatomy" />

      <SyntaxSection
        id="timers"
        title="Timers & Direction"
        description="Durations can count down, count up, or record elapsed time. The direction is controlled by the format and optional prefix modifiers. Use * to mark a rest period."
        tabs={TIMERS_TABS}
        align="left"
        actualTheme={theme}
        icon={Clock}
      />

      <SyntaxSection
        id="metrics"
        title="Measuring Effort"
        description="Quantities attach to movements: reps, load (lb/kg/bw), and distance (m, km, ft, miles). Combine multiple metrics on one line. Use ? for load values you want to capture at runtime."
        tabs={METRICS_TABS}
        align="right"
        actualTheme={theme}
        icon={BarChart2}
      />

      <SyntaxSection
        id="groups"
        title="Groups & Repeaters"
        description="Parentheses group statements into rounds. A single number repeats everything inside. Dash-separated values create a rep sequence. Groups can nest inside each other."
        tabs={GROUPS_TABS}
        align="left"
        actualTheme={theme}
        icon={Layers}
      />

      <SyntaxSection
        id="protocols"
        title="Workout Protocols"
        description="WodScript recognizes standard CrossFit protocols by keyword. AMRAP runs unbounded rounds against a countdown. EMOM fires an interval every minute. FOR TIME runs a stopwatch to completion."
        tabs={PROTOCOLS_TABS}
        align="right"
        actualTheme={theme}
        icon={Zap}
      />

      <SyntaxSection
        id="supplemental"
        title="Supplemental Syntax"
        description="Square brackets define action checkpoints (non-movement steps). The * prefix marks rest periods. Double-slash starts an inline coach annotation that is hidden from the execution overlay."
        tabs={SUPPLEMENTAL_TABS}
        align="left"
        actualTheme={theme}
        icon={PlusCircle}
      />

      <SyntaxSection
        id="document"
        title="The Document Layer"
        description="WodScript lives inside a Markdown document. Everything outside a wod block is standard Markdown: headers, notes, checklists, tables, links. Use multiple wod blocks in one file to structure a full training day."
        tabs={DOCUMENT_TABS}
        align="right"
        actualTheme={theme}
        icon={FileText}
      />

      <section className="py-20 bg-muted/20 text-center">
        <div className="mx-auto max-w-4xl px-6 space-y-8">
          <Terminal className="size-12 mx-auto text-primary opacity-50" />
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground uppercase italic">Ready to script?</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/playground')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground text-sm font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/30 transition-all hover:scale-[1.05] active:scale-95"
            >
              Start New Playground
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => navigate('/getting-started')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-card border border-border text-foreground text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:bg-muted active:scale-95"
            >
              <BookOpen size={16} />
              Interactive Tutorial
            </button>
          </div>
        </div>
      </section>

      <footer className="py-10 border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 flex flex-wrap justify-center gap-x-12 gap-y-4">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Code2 size={12} /> WodScript v0.5.0
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <ScanLine size={12} /> 7 Fragment Types
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Zap size={12} /> 4 Workout Protocols
          </div>
        </div>
      </footer>
    </div>
  )
}
