# Canvas Architecture Deepening

This document outlines the "Before & After" states for three proposed architectural refactors in the canvas section. 

## 1. Consolidate Canvas Section Attributes

**Problem**: The parser stops halfway, emitting raw `attrs: string[]`. React components must use a shallow utility file (`canvasSectionUtils.ts`) to finish parsing these at render time.

### Before

**Interface & State (`parseCanvasMarkdown.ts`)**:
```typescript
export interface CanvasSection {
  id: string
  heading: string
  attrs: string[] // e.g. ['sticky', 'dark', 'full-bleed', 'density:compact']
  proseChunks: ProseChunk[]
}
```

**Implementation (`canvasSectionUtils.ts` + `CanvasSection.tsx`)**:
```typescript
// canvasSectionUtils.ts (Shallow utility module)
export const isFullBleed = (s: CanvasSection) => s.attrs.includes('full-bleed')
export const isDark = (s: CanvasSection) => s.attrs.includes('dark')
export const getSectionDensity = (s: CanvasSection) => 
  s.attrs.find(a => a.startsWith('density:'))?.slice(8) ?? 'default'

// CanvasSection.tsx (React Layer)
import { isFullBleed, isDark, getSectionDensity } from './canvasSectionUtils'

export const CanvasSection = ({ section }) => {
  const fullBleed = isFullBleed(section)
  const dark = isDark(section)
  const density = getSectionDensity(section)
  
  return <div className={cn(dark && 'bg-muted', fullBleed && 'w-full')} />
}
```

### After

**Interface & State (`parseCanvasMarkdown.ts`)**:
```typescript
export type SectionTheme = 'slate' | 'amber' | 'emerald' | 'sky' | 'violet' | 'rose'
export type SectionDensity = 'default' | 'compact'

export interface CanvasSection {
  id: string
  heading: string
  proseChunks: ProseChunk[]
  
  // Parsed directly into the domain object:
  theme: SectionTheme
  density: SectionDensity
  isDark: boolean
  isFullBleed: boolean
  isSticky: boolean
}
```

**Implementation (`parseCanvasMarkdown.ts` + `CanvasSection.tsx`)**:
```typescript
// parseCanvasMarkdown.ts (Deep parsing)
function parseSection(text: string): CanvasSection {
  // ...
  return {
    // ...
    isFullBleed: meta.attrs.includes('full-bleed'),
    isDark: meta.attrs.includes('dark'),
    density: meta.attrs.find(a => a.startsWith('density:'))?.slice(8) as SectionDensity ?? 'default',
  }
}

// CanvasSection.tsx (React Layer)
// NO UTILITY IMPORTS NEEDED
export const CanvasSection = ({ section }) => {
  // Directly consume the shaped domain object
  return <div className={cn(section.isDark && 'bg-muted', section.isFullBleed && 'w-full')} />
}
```

**Impact**: 
- **Locality**: We delete `canvasSectionUtils.ts` completely. Parsing logic lives in the parser.
- **Testability**: We test the parser output once, verifying `isDark`, `isFullBleed`, etc., without needing React component tests to verify utility wiring.


---

## 2. Formalize Inline Widgets in the Parser

**Problem**: `CanvasProsePanel` re-concatenates `proseChunks` to regex-split on tokens like `{{workouts}}`, leaking text parsing into the view layer.

### Before

**Interface & State (`parseCanvasMarkdown.ts`)**:
```typescript
export type ProseChunk =
  | { kind: 'prose'; text: string }
  | { kind: 'button'; button: ButtonBlock }
```

**Implementation (`CanvasProsePanel.tsx`)**:
```typescript
// React component performing string manipulation
const sectionProse = getSectionProse(section); // Re-concatenates all prose chunks

if (sectionProse.includes('{{workouts}}')) {
  const [beforeProse = '', afterProse = ''] = sectionProse.split('{{workouts}}')
  return [
    <CanvasSectionComponent prose={beforeProse} />,
    <CollectionWorkoutsList />,
    <CanvasSectionComponent prose={afterProse} />
  ]
}
```

### After

**Interface & State (`parseCanvasMarkdown.ts`)**:
```typescript
export type ProseChunk =
  | { kind: 'prose'; text: string }
  | { kind: 'button'; button: ButtonBlock }
  | { kind: 'widget'; widget: 'hero-carousel' | 'workouts-list' }
```

**Implementation (`CanvasProsePanel.tsx`)**:
```typescript
// parseCanvasMarkdown.ts splits out the widgets during the parse phase.
// The React component just maps over the chunks cleanly:

export const CanvasSection = ({ section }) => {
  return (
    <>
      {section.proseChunks.map(chunk => {
        if (chunk.kind === 'prose') return <CanvasProse text={chunk.text} />
        if (chunk.kind === 'button') return <SectionButtons button={chunk.button} />
        if (chunk.kind === 'widget') {
            if (chunk.widget === 'workouts-list') return <CollectionWorkoutsList />
            if (chunk.widget === 'hero-carousel') return <HeroCarousel />
        }
      })}
    </>
  )
}
```

**Impact**: 
- **Locality**: Text parsing stays in the parser. The React component just maps data to UI.
- **Leverage**: The `CanvasSection` component no longer has to render multiple copies of itself (`beforeProse`, `afterProse`) just to jam a React widget in the middle of a paragraph.


---

## 3. Consolidate Syntax Challenge Compilation

**Problem**: The validation hook spins up its own parser because the upstream editor event doesn't pass down the compiled AST.

### Before

**Interface & State (`useSyntaxChallenge.ts`)**:
```typescript
export function useSyntaxChallenge({ block }) {
  // Hook manually recompiles string -> AST on every keystroke
  const compiledStatements = useMemo(() => {
    if (!block?.content) return [];
    const script = createParser().read(block.content);
    return script.statements ?? [];
  }, [block?.content]);

  const results = useMemo(() => {
    const statements = block.statements ?? compiledStatements;
    // validate statements...
  }, [block, compiledStatements]);
}
```

### After

**Interface & State (`components/Editor/types.ts`)**:
```typescript
export interface ScriptBlock {
  id: string;
  content: string;
  // Deepen the interface to ALWAYS include statements when emitted
  statements: ICodeStatement[]; 
}
```

**Implementation (`useSyntaxChallenge.ts`)**:
```typescript
export function useSyntaxChallenge({ block }) {
  // Hook is purely reactive to the upstream compilation
  const results = useMemo(() => {
    if (!block) return {};
    
    // Trust that the block is already compiled by the editor
    for (const q of quests) {
      out[q.id] = validateScriptBlock(block, q.validation);
    }
  }, [block]);
}
```

**Impact**:
- **Leverage**: The editor assumes responsibility for compilation. Downstream consumers (validation, analytics, rendering) all share the exact same `statements` reference.
- **Locality**: Compilation errors or parser lifecycle management remain in the editor component, rather than bleeding into the validation hooks.
