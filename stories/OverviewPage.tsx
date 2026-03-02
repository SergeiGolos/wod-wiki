import React from 'react';
import { 
  Calendar, 
  Activity, 
  ClipboardCheck, 
  Tv, 
  Database, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Badge } from '../src/components/ui/badge';
import { cn } from '../src/lib/utils';

interface FeatureProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  color: string;
  tags: string[];
}

const FeatureCard: React.FC<FeatureProps> = ({ title, description, icon, link, color, tags }) => (
  <Card className="group hover:shadow-lg transition-all duration-300 border-muted/50 overflow-hidden flex flex-col h-full">
    <div className={cn("h-2 w-full", color)} />
    <CardHeader className="pb-4">
      <div className="flex justify-between items-start mb-2">
        <div className={cn("p-2 rounded-lg bg-muted/50 text-foreground group-hover:scale-110 transition-transform duration-300")}>
          {icon}
        </div>
        <div className="flex gap-1">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px] uppercase tracking-wider px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <CardTitle className="text-xl group-hover:text-primary transition-colors">{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex-1 flex flex-col justify-between">
      <CardDescription className="text-sm leading-relaxed mb-6">
        {description}
      </CardDescription>
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full justify-between group/btn hover:bg-primary/5 -mx-2 px-2"
        onClick={() => {
            if (window.parent) {
                window.parent.location.href = link;
            } else {
                window.location.href = link;
            }
        }}
      >
        <span className="font-semibold text-xs uppercase tracking-widest">Explore Details</span>
        <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
      </Button>
    </CardContent>
  </Card>
);

export const OverviewPage: React.FC = () => {
  const features: FeatureProps[] = [
    {
      title: "Intelligent Planning",
      description: "Define complex workouts using a specialized Markdown syntax. Leverage LLMs to convert natural language into executable workout logic with loops, timers, and conditional metrics.",
      icon: <Calendar className="h-6 w-6" />,
      link: "./?path=/story/overview--planning",
      color: "bg-blue-500",
      tags: ["Markdown", "LLM-Ready"]
    },
    {
      title: "Real-time Tracking",
      description: "Execute workouts with a high-precision runtime engine. Automatically track time, reps, and load without manual logging, while maintaining a rich visual state for the athlete.",
      icon: <Activity className="h-6 w-6" />,
      link: "./?path=/story/overview--tracking",
      color: "bg-emerald-500",
      tags: ["Runtime", "Automated"]
    },
    {
      title: "Analytics & Review",
      description: "Post-workout analysis powered by the Review Grid. Pivot and filter your performance data, view progress trends, and export structured results to your history.",
      icon: <ClipboardCheck className="h-6 w-6" />,
      link: "./?path=/story/overview--review",
      color: "bg-orange-500",
      tags: ["Insights", "History"]
    },
    {
      title: "Chromecast Display",
      description: "The '10-foot experience' for the gym. Cast your active workout to any TV with full remote control (D-Pad) support, keeping your focus on the movement, not the phone.",
      icon: <Tv className="h-6 w-6" />,
      link: "./?path=/story/overview--chromecast",
      color: "bg-purple-500",
      tags: ["Remote", "Big Screen"]
    },
    {
      title: "Data Ownership",
      description: "Your data stays yours. Local-first architecture using Markdown files ensures that your workout history is portable, human-readable, and free from platform lock-in.",
      icon: <Database className="h-6 w-6" />,
      link: "./?path=/story/overview--data-ownership",
      color: "bg-slate-500",
      tags: ["Local-First", "Privacy"]
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 max-w-7xl mx-auto">
      <header className="mb-16">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 px-3 py-1">
            v0.5.0 Release
          </Badge>
          <div className="h-px w-12 bg-border" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Project Overview</span>
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6">WOD Wiki</h1>
        <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
          A programmable workout platform for athletes and coaches. WOD Wiki combines the simplicity of Markdown with the power of a real-time execution engine.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
        {features.map((feature, i) => (
          <FeatureCard key={i} {...feature} />
        ))}
        
        {/* Placeholder for Quick Start / Getting Started */}
        <Card className="bg-muted/30 border-dashed border-2 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 rounded-full bg-background border mb-4">
                <ChevronRight className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold mb-2">Getting Started</h3>
            <p className="text-sm text-muted-foreground mb-4">Ready to build your first workout? Check out the syntax guide.</p>
            <Button variant="outline" size="sm" onClick={() => {
                if (window.parent) window.parent.location.href = './?path=/story/syntax--ai-skill';
            }}>
                View Syntax Guide
            </Button>
        </Card>
      </div>

      <section className="border-t pt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
                <h4 className="font-bold uppercase text-xs tracking-widest text-muted-foreground mb-4">Open Source</h4>
                <p className="text-sm text-muted-foreground">Built with React, TypeScript, and Tailwind CSS. Join the community on GitHub.</p>
            </div>
            <div>
                <h4 className="font-bold uppercase text-xs tracking-widest text-muted-foreground mb-4">The Mission</h4>
                <p className="text-sm text-muted-foreground">To make workout definitions as portable and powerful as code, enabling better tracking and sharing.</p>
            </div>
            <div>
                <h4 className="font-bold uppercase text-xs tracking-widest text-muted-foreground mb-4">Local First</h4>
                <p className="text-sm text-muted-foreground">Your history is stored in MD files. No cloud required, but fully syncable with standard tools.</p>
            </div>
        </div>
      </section>

      <footer className="mt-20 pt-8 border-t flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
        <span>&copy; 2026 WOD Wiki Project</span>
        <span>Built for Performance</span>
      </footer>
    </div>
  );
};
