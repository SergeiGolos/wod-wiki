import React, { useState, useEffect } from 'react';
import { SectionEditor } from '../src/markdown-editor/SectionEditor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Bot, 
  Cpu, 
  Settings, 
  Terminal,
  Download,
  ClipboardCheck,
  Clipboard,
  Loader2
} from 'lucide-react';
import { cn } from '../src/lib/utils';

interface HeroPanel {
  id: string;
  provider: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  steps: string[];
}

const HERO_PANELS: HeroPanel[] = [
  {
    id: 'openai',
    provider: 'OpenAI',
    title: 'Custom GPT Setup',
    icon: <Bot className="h-10 w-10 text-emerald-500" />,
    description: 'Create a specialized workout encoder in ChatGPT.',
    steps: [
      'Download SKILL.md to your local machine.',
      'Go to ChatGPT -> Explore GPTs -> Create.',
      'In "Configure", upload SKILL.md to Knowledge.',
      'Add instruction: "Always use WOD Wiki syntax for workouts."'
    ]
  },
  {
    id: 'anthropic',
    provider: 'Anthropic',
    title: 'Claude Projects',
    icon: <Zap className="h-10 w-10 text-orange-500" />,
    description: 'Use Claude Artifacts to generate and visualize WODs.',
    steps: [
      'Open a new Claude Project or Chat.',
      'Paste the content of SKILL.md into project files.',
      'Tell Claude: "You are an expert at workout extraction."',
      'Claude will now use the syntax in Artifacts.'
    ]
  },
  {
    id: 'google',
    provider: 'Google',
    title: 'Gemini Gems',
    icon: <Cpu className="h-10 w-10 text-blue-500" />,
    description: 'Configure a Gem with deep workout understanding.',
    steps: [
      'Go to Gemini -> Gem Manager -> New Gem.',
      'Name it "WOD Encoder".',
      'Paste SKILL.md content into Instructions.',
      'Gemini will now follow the syntax rules strictly.'
    ]
  },
  {
    id: 'local',
    provider: 'Local LLM',
    title: 'Ollama / LM Studio',
    icon: <Terminal className="h-10 w-10 text-slate-500" />,
    description: 'Run extraction privately on your own hardware.',
    steps: [
      'Create a new Modelfile.',
      'Add SYSTEM """ [Paste SKILL.md Content] """.',
      'Run "ollama create wod-extractor -f Modelfile".',
      'Enjoy fast, private workout encoding.'
    ]
  }
];

export const AISkillPage: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/wod-extraction-skill.md')
      .then(res => res.text())
      .then(text => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load markdown skill:', err);
        setLoading(false);
      });
  }, []);

  const nextPanel = () => setActiveIndex((prev) => (prev + 1) % HERO_PANELS.length);
  const prevPanel = () => setActiveIndex((prev) => (prev - 1 + HERO_PANELS.length) % HERO_PANELS.length);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SKILL.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <div className="w-full max-w-6xl px-6 pt-12 pb-8 text-center">
        <h2 className="text-muted-foreground text-sm font-medium tracking-widest uppercase mb-4">
          LLM-First Engineering
        </h2>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
          AI Skill Documentation
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed italic">
          "The syntax isn't for everyone, but markdown is for LLMs."
        </p>
      </div>

      {/* Sliding Hero Panels */}
      <div className="w-full max-w-6xl px-6 mb-16 relative group">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-xl h-[400px] relative">
          <div 
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {HERO_PANELS.map((panel) => (
              <div key={panel.id} className="min-w-full h-full p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-xl">
                      {panel.icon}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-primary tracking-wider uppercase">{panel.provider}</div>
                      <h3 className="text-2xl font-bold">{panel.title}</h3>
                    </div>
                  </div>
                  <p className="text-lg text-muted-foreground">
                    {panel.description}
                  </p>
                  <div className="flex gap-4 pt-2">
                    <Button onClick={handleCopy} variant="default" className="gap-2">
                      {copied ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                      {copied ? "Copied Skill!" : "Copy SKILL.md"}
                    </Button>
                    <Button onClick={handleDownload} variant="outline" className="gap-2">
                      Download SKILL.md <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 w-full bg-muted/50 rounded-xl p-6 border border-border/50">
                  <h4 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" /> Setup Instructions
                  </h4>
                  <ul className="space-y-3">
                    {panel.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Controls */}
          <button 
            onClick={prevPanel}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 border shadow-sm hover:bg-background transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button 
            onClick={nextPanel}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 border shadow-sm hover:bg-background transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {HERO_PANELS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  i === activeIndex ? "bg-primary w-6" : "bg-primary/20 hover:bg-primary/40"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content Divider */}
      <div className="w-full max-w-4xl px-6 mb-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Skill Documentation</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Markdown Content */}
      <div className="w-full max-w-4xl bg-background border rounded-2xl shadow-sm overflow-hidden mb-12 min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-full py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <SectionEditor
            initialContent={markdown}
            editable={false}
            showLineNumbers={true}
            contentClassName="px-8 py-10"
          />
        )}
      </div>

      <div className="text-muted-foreground text-sm text-center">
        Built for WOD Wiki — The Open Workout Definition Language
      </div>
    </div>
  );
};
