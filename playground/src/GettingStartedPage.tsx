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
    <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 flex flex-col min-h-0">
      <div className="flex-1 flex flex-col min-h-0 space-y-0">
        <section className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="px-6 py-10 lg:px-10">
            <div className="prose dark:prose-invert max-w-none">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">Mastering the Editor</h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                This guide will walk you through the core features of the Wod Wiki editor. Each section below is a live editor where you can experiment.
              </p>
            </div>
          </div>
        </section>
        
        <section className="flex-1 flex flex-col min-h-0">
          <div className="bg-zinc-50 dark:bg-zinc-800/50 px-6 py-2 border-b border-zinc-200 dark:border-zinc-800 lg:px-10">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Lesson 1: Note Basics</span>
          </div>
          <div className="flex-1 flex flex-col min-h-[400px]">
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

        <section className="bg-white dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800">
          <div className="px-6 py-10 lg:px-10">
            <div className="prose dark:prose-invert max-w-none">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">Block Specialization</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Wod Wiki goes beyond plain text. Use code blocks to define executable logic and structured data.
              </p>
            </div>
          </div>
        </section>

        <section className="flex-1 flex flex-col min-h-0">
          <div className="bg-zinc-50 dark:bg-zinc-800/50 px-6 py-2 border-b border-zinc-200 dark:border-zinc-800 lg:px-10">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Lesson 2: Blocks</span>
          </div>
          <div className="flex-1 flex flex-col min-h-[500px]">
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

        <section className="p-6 lg:p-10 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl p-8 text-center space-y-4 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">Ready to build?</h3>
            <p className="text-blue-700 dark:text-blue-300 max-w-md mx-auto">
              Now that you've seen the basics, try creating your own playground note and design your first workout.
            </p>
            <button 
              onClick={() => navigate('/playground')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition-all active:scale-95 mx-auto"
            >
              <PlusIcon className="size-5" />
              Create New Playground
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
