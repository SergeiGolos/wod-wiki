import React, { useState } from 'react'
import { UnifiedEditor } from '@/components/Editor/UnifiedEditor'
import { useNavigate } from 'react-router-dom'

const SECTION_1_CONTENT = `# Welcome to Wod Wiki
Notes are flexible documents where you can combine structured instructions with live, runnable workout blocks.

### The Anatomy of a Note
A note can contain:
- **Headers** (using #, ##, ###)
- **Paragraphs** for general context
- **Tables** for structured data
- **WOD Blocks** for live execution

| Equipment | Weight |
|-----------|--------|
| Kettlebell| 24kg   |
| Barbell   | 95lb   |

Below is a simple 5-second countdown block. Click **Run** to see it in action:

\`\`\`wod
5s Countdown
\`\`\``

const SECTION_2_CONTENT = `## Advanced Block Types
Wod Wiki supports several specialized block types using the \` \` \` syntax.

### The WOD Block
The standard block for workout execution. It supports timers, rep schemes, and complex intervals.

\`\`\`wod
5:00 AMRAP
10 Air Squats
10 Pushups
\`\`\`

### The Metadata Block
Use \` \` \`json or \` \` \`yaml blocks to define structured metadata for your notes, such as difficulty, tags, or equipment requirements.

\`\`\`json
{
  "difficulty": "Intermediate",
  "tags": ["Full Body", "Kettlebell"],
  "equipment": ["24kg KB"]
}
\`\`\``

export function GettingStartedPage({ theme }: { theme: string }) {
  const navigate = useNavigate()
  const [content1, setContent1] = useState(SECTION_1_CONTENT)
  const [content2, setContent2] = useState(SECTION_2_CONTENT)

  return (
    <div className="flex-1 overflow-y-auto bg-background flex flex-col min-h-0">
      <div className="flex-1 flex flex-col min-h-0 space-y-0">
        <section className="bg-card border-b-2 border-border">
          <div className="px-6 py-12 lg:px-10">
            <div className="max-w-none">
              <h1 className="text-4xl font-black tracking-tight text-foreground leading-none mb-4">Mastering the Editor</h1>
              <p className="text-xl font-medium text-muted-foreground max-w-2xl leading-relaxed">
                This guide will walk you through the core features of the Wod Wiki editor. Each section below is a live editor where you can experiment.
              </p>
            </div>
          </div>
        </section>
        
        <section className="flex-1 flex flex-col min-h-0">
          <div className="bg-muted px-6 py-3 border-b-2 border-border lg:px-10">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Lesson 1: Note Basics</span>
          </div>
          <div className="flex-1 flex flex-col min-h-[450px]">
            <UnifiedEditor
              value={content1}
              onChange={setContent1}
              noteId="getting-started-1"
              enableInlineRuntime={true}
              visibleCommands={1}
              className="flex-1 min-h-0 w-full"
              theme={theme}
            />
          </div>
        </section>

        <section className="bg-card border-y-2 border-border">
          <div className="px-6 py-12 lg:px-10">
            <div className="max-w-none">
              <h2 className="text-3xl font-black tracking-tight text-foreground leading-none mb-4">Block Specialization</h2>
              <p className="text-xl font-medium text-muted-foreground max-w-2xl leading-relaxed">
                Wod Wiki goes beyond plain text. Use code blocks to define executable logic and structured data.
              </p>
            </div>
          </div>
        </section>

        <section className="flex-1 flex flex-col min-h-0">
          <div className="bg-muted px-6 py-3 border-b-2 border-border lg:px-10">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Lesson 2: Blocks</span>
          </div>
          <div className="flex-1 flex flex-col min-h-[550px]">
            <UnifiedEditor
              value={content2}
              onChange={setContent2}
              noteId="getting-started-2"
              enableInlineRuntime={true}
              visibleCommands={1}
              className="flex-1 min-h-0 w-full"
              theme={theme}
            />
          </div>
        </section>

        <section className="p-8 lg:p-16 bg-background">
          <div className="bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl p-12 text-center space-y-6 max-w-4xl mx-auto">
            <div className="size-16 bg-primary rounded-xl flex items-center justify-center text-primary-foreground mx-auto shadow-lg shadow-primary/20 rotate-3 mb-4">
              <PlusIcon className="size-8" />
            </div>
            <h3 className="text-3xl font-black tracking-tight text-foreground leading-none">Ready to build?</h3>
            <p className="text-xl font-medium text-muted-foreground max-w-md mx-auto leading-relaxed">
              Now that you've seen the basics, try creating your own playground note and design your first workout.
            </p>
            <button 
              onClick={() => navigate('/playground')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 mx-auto"
            >
              <PlusIcon className="size-6" />
              Start Building
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  )
}
