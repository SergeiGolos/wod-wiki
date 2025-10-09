# WOD Wiki - Visual Implementation Map

## System Flow with Implementation Status

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WOD WIKI DATA FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

USER INPUT                    PARSING                    COMPILATION
━━━━━━━━━━                    ━━━━━━━                    ━━━━━━━━━━━
                                                         
"20:00 AMRAP     ──────────►  Parser          ─────────►  JitCompiler
 5 Pullups                    ✅ 100%                      ✅ 95%
 10 Pushups                   (Chevrotain)                 (Strategy Pattern)
 15 Air Squats"               
                              CodeStatement                IRuntimeBlockStrategy
                              tree with                    - TimerStrategy ✅
                              fragments                    - RoundsStrategy ✅
                                                          - EffortStrategy ✅


RUNTIME EXECUTION             UI DISPLAY                 RECORDING
━━━━━━━━━━━━━━━━━             ━━━━━━━━━━                 ━━━━━━━━━

RuntimeStack     ─────────►   ClockAnchor     ─────────►  WorkoutResult
⚠️ 40%                        🟡 60%                       ❌ 0%
                                                          
IRuntimeBlock               TimeDisplay                  ResultRecorder
implementations:            ✅ Component                  ❌ Not started
                            ❌ Not connected
❌ TimerBlock (missing)                                   LocalStorage
❌ RoundsBlock (missing)    Live timer updates           persistence
❌ EffortBlock (missing)    ❌ Not working                ❌ Not implemented
                                                          
✅ RuntimeBlock             Memory-driven                 Workout history
   (generic base)           display                       ❌ Not implemented
                            ⚠️ Partial


SUPPORTING SYSTEMS
━━━━━━━━━━━━━━━━━

RuntimeMemory    ✅ 100%    │    Event System       🟡 70%    │    Behaviors          ✅ 100%
- Typed refs               │    - NextEvent        ✅        │    - Child Advance    ✅
- Allocation               │    - NextAction       ✅        │    - Lazy Compile     ✅
- Cleanup                  │    - TimerTick        ❌        │    - Timer            ✅
- Search                   │    - RepComplete      ❌        │    - Completion       ✅
                           │    - RoundComplete    ❌        │
```

---

## Layer-by-Layer Breakdown

### Layer 1: Input & Parsing ✅ **COMPLETE**

```
Markdown Script
      ↓
┌─────────────┐
│   Parser    │  ✅ Chevrotain-based
│             │  ✅ Token definitions  
│             │  ✅ Visitor pattern
│             │  ✅ Fragment extraction
└─────────────┘
      ↓
  CodeStatement
  (AST nodes)
```

**Status**: Production-ready  
**Tests**: All passing  
**Missing**: Nothing

---

### Layer 2: Compilation ✅ **95% COMPLETE**

```
  CodeStatement
      ↓
┌─────────────────────┐
│   JitCompiler       │  ✅ Strategy registration
│                     │  ✅ Fragment matching
│   registerStrategy()│  ✅ Precedence system
│   compile()         │  ✅ Behavior composition
└─────────────────────┘
      ↓
┌─────────────────────┐
│  Strategy Selection │  
│                     │  ✅ TimerStrategy
│  match() → boolean  │  ✅ RoundsStrategy
│  compile() → Block  │  ✅ EffortStrategy
│                     │  ⚠️ EMOM (commented out)
│                     │  ⚠️ Tabata (not implemented)
└─────────────────────┘
      ↓
  IRuntimeBlock
  (with behaviors)
```

**Status**: Nearly production-ready  
**Tests**: 27/27 passing  
**Missing**: Advanced strategies (EMOM, Tabata)

---

### Layer 3: Runtime Execution ⚠️ **40% COMPLETE** ← CRITICAL GAP

```
  IRuntimeBlock
      ↓
┌──────────────────────────────────────────────┐
│           RuntimeStack                       │
│                                              │
│  ✅ push(block)    - Adds to stack          │
│  ✅ pop()          - Removes & returns      │
│  ✅ current()      - Gets top block         │
│  ✅ graph()        - Full stack view        │
└──────────────────────────────────────────────┘
      ↓
┌──────────────────────────────────────────────┐
│           Runtime Blocks (MISSING!)          │
│                                              │
│  ❌ TimerBlock                               │
│     - Countdown logic                        │
│     - Tick events                            │
│     - Completion detection                   │
│                                              │
│  ❌ RoundsBlock                              │
│     - Round iteration                        │
│     - Round counter                          │
│     - Child compilation per round            │
│                                              │
│  ❌ EffortBlock                              │
│     - Exercise display                       │
│     - Rep counting                           │
│     - Completion tracking                    │
│                                              │
│  ✅ RuntimeBlock (generic base exists)       │
└──────────────────────────────────────────────┘
      ↓
  IRuntimeAction[]
  (next steps)
```

**Status**: Foundation exists, implementations missing  
**Tests**: 86/100 failing (test infrastructure issue)  
**Missing**: Concrete block types with execution logic

---

### Layer 4: State Management ✅ **100% COMPLETE**

```
┌──────────────────────────────────────────────┐
│           RuntimeMemory                      │
│                                              │
│  ✅ allocate<T>()     - Type-safe refs      │
│  ✅ get<T>()          - Read values         │
│  ✅ set<T>()          - Update values       │
│  ✅ search()          - Find refs           │
│  ✅ release()         - Cleanup             │
└──────────────────────────────────────────────┘
      ↓
TypedMemoryReference<T>
      ↓
┌──────────────────────────────────────────────┐
│         Memory Consumers                     │
│                                              │
│  ✅ TimerBehavior                            │
│     - timeSpans: TimeSpan[]                  │
│     - isRunning: boolean                     │
│                                              │
│  ⚠️ Clock Components (not connected yet)     │
└──────────────────────────────────────────────┘
```

**Status**: Production-ready  
**Tests**: 14/14 passing  
**Missing**: UI components need to subscribe to memory changes

---

### Layer 5: UI Display 🟡 **60% COMPLETE**

```
┌──────────────────────────────────────────────┐
│           Clock Components                   │
│                                              │
│  ✅ ClockAnchor        - Container          │
│  ✅ TimeDisplay        - Formatter          │
│  ✅ TimeUnit           - D/H/M/S display    │
│                                              │
│  ❌ NOT CONNECTED TO RUNTIME                 │
│                                              │
│  Current: Static props                       │
│  Needed: Runtime memory subscription         │
└──────────────────────────────────────────────┘
      ↓
┌──────────────────────────────────────────────┐
│       Timer Memory Visualization             │
│                                              │
│  ✅ TimerMemoryVisualization component       │
│  🟡 Spec 010 defined but not implemented     │
└──────────────────────────────────────────────┘
```

**Status**: Components exist, integration missing  
**Tests**: Storybook stories render  
**Missing**: Live updates from runtime state

---

### Layer 6: Recording ❌ **0% COMPLETE** ← MISSING ENTIRELY

```
┌──────────────────────────────────────────────┐
│           Recording System (MISSING)         │
│                                              │
│  ❌ WorkoutResult data model                 │
│  ❌ ResultRecorder service                   │
│  ❌ LocalStorage persistence                 │
│  ❌ Workout history view                     │
│  ❌ Rep count input                          │
│  ❌ Time-on-completion capture               │
└──────────────────────────────────────────────┘
```

**Status**: Not started  
**Tests**: N/A  
**Missing**: Everything

---

## Example Execution Flow (Current vs. Desired)

### Current State (Demo Only)

```
1. User writes: "20:00 AMRAP\n  5 Pullups"
   ✅ Works

2. Parser creates CodeStatement tree
   ✅ Works

3. JIT compiles to RuntimeBlock with TimerBehavior
   ✅ Works

4. Block pushed to RuntimeStack
   ✅ Works

5. Storybook displays compilation visualization
   ✅ Works

6. User clicks "Next Block" button
   ✅ Works (compiles child blocks)

7. Timer counts down
   ❌ DOESN'T HAPPEN - no countdown logic

8. Clock updates every second
   ❌ DOESN'T HAPPEN - clock not subscribed to memory

9. Timer completes at 0:00
   ❌ DOESN'T HAPPEN - no completion detection

10. Results recorded
    ❌ DOESN'T EXIST
```

### Desired State (Full Product)

```
1. User selects workout: "Cindy"
   ⚠️ Need workout library UI

2. User clicks "Start"
   ⚠️ Need start button + handler

3. Timer begins countdown: 20:00 → 19:59 → ...
   ❌ Need TimerBlock with setInterval logic

4. Clock displays live updates
   ❌ Need memory subscription in TimeDisplay

5. User completes round: 5 pullups, 10 pushups, 15 squats
   ❌ Need rep count input UI

6. User enters reps in form
   ❌ Need recording form

7. Timer expires at 0:00
   ❌ Need completion detection in TimerBlock

8. Workout auto-completes
   ❌ Need completion handler

9. Results saved: "Cindy - 12 rounds + 3 reps - 2024-10-08"
   ❌ Need ResultRecorder + persistence

10. User views history
    ❌ Need workout history UI
```

---

## Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                     IMPLEMENTED ✅                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    Parser ──────────► CodeStatement                        │
│      ▲                     │                               │
│      │                     ▼                               │
│      │              JitCompiler ──────► Strategy           │
│      │                     │                 │             │
│      │                     ▼                 ▼             │
│      │              RuntimeBlock ◄──── Behaviors           │
│      │                     │                               │
│      │                     ▼                               │
│      │              RuntimeStack                           │
│      │                     │                               │
│      │                     ▼                               │
│      └──────────────  RuntimeMemory                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   PARTIALLY IMPLEMENTED 🟡                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    RuntimeMemory ──?──► TimeDisplay                        │
│                           (not connected)                   │
│                                                             │
│    RuntimeBlock  ──?──► Concrete Blocks                    │
│                          (not implemented)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      MISSING ❌                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    TimerBlock        (execution logic)                      │
│    RoundsBlock       (iteration logic)                      │
│    EffortBlock       (rep tracking)                         │
│                                                             │
│    ResultRecorder    (persistence)                          │
│    WorkoutHistory    (display)                              │
│    RepCountInput     (UI control)                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### ✅ Foundation (Complete)
- [x] Parser with Chevrotain
- [x] CodeStatement data model
- [x] Fragment types (Timer, Rounds, Effort, etc.)
- [x] JIT compiler architecture
- [x] Strategy pattern
- [x] Behavior system
- [x] RuntimeStack
- [x] RuntimeMemory
- [x] Monaco Editor integration
- [x] Storybook visualization

### 🟡 Runtime Execution (40% Complete)
- [x] IRuntimeBlock interface
- [x] RuntimeBlock base class
- [x] Lifecycle methods (push/next/pop)
- [ ] **TimerBlock implementation** ← CRITICAL
- [ ] **RoundsBlock implementation** ← CRITICAL
- [ ] **EffortBlock implementation** ← CRITICAL
- [ ] **Completion detection** ← CRITICAL
- [ ] Timer tick events
- [ ] Round complete events
- [ ] Rep complete events

### 🟡 UI Integration (60% Complete)
- [x] Clock components (ClockAnchor, TimeDisplay, TimeUnit)
- [x] Static time display
- [ ] **Memory subscription in TimeDisplay** ← CRITICAL
- [ ] **Live timer updates** ← CRITICAL
- [ ] Start/stop controls
- [ ] Pause/resume controls
- [ ] Rep count input
- [ ] Round counter display
- [ ] Progress indicators

### ❌ Recording System (0% Complete)
- [ ] WorkoutResult data model
- [ ] ResultRecorder service
- [ ] LocalStorage persistence
- [ ] Workout history list
- [ ] Result detail view
- [ ] Edit past results
- [ ] PR detection
- [ ] Export results

### 🟡 Additional Features
- [x] Audio cues (implemented but not integrated)
- [ ] Workout library UI
- [ ] Custom workout creation
- [ ] Mobile optimization
- [ ] Offline PWA
- [ ] Share workouts

---

## Priority Matrix

```
                High Impact
                    │
      IMPLEMENT     │     NICE TO HAVE
         NOW        │
                    │
   ─────────────────┼─────────────────
                    │
      FIX LATER     │     LOW PRIORITY
                    │
                Low Impact
```

**High Impact + High Priority (DO NOW)**:
1. ✅ TimerBlock implementation
2. ✅ Connect timer to UI
3. ✅ Completion detection
4. ✅ Basic recording

**High Impact + Medium Priority (DO SOON)**:
5. 🟡 RoundsBlock & EffortBlock
6. 🟡 Workout history view
7. 🟡 Rep count input
8. 🟡 Mobile responsive

**Medium Impact + Low Priority (DO LATER)**:
9. ⚪ Pause/resume
10. ⚪ Advanced strategies (EMOM, Tabata)
11. ⚪ Custom workout creation
12. ⚪ Export/share

---

## Timeline Estimate

**Weeks 1-2**: Foundation fixes + TimerBlock  
**Weeks 3-4**: RoundsBlock + EffortBlock + Full AMRAP execution  
**Weeks 5-6**: Recording system + History view  
**Weeks 7-9**: Polish + Mobile + Additional workout types  

**Total to MVP**: ~6 weeks  
**Total to v1.0**: ~9-12 weeks

---

**Last Updated**: October 8, 2025  
**See Also**: `implementation-roadmap.md`, `implementation-status-summary.md`
