import React from 'react';
import type { CommandPaletteResult, CommandStrategy } from '../components/command-palette/types';
import { indexedDBService } from '@/services/db/IndexedDBService';

/**
 * Strategy 1: Global Search (Ctrl + K)
 * Searches across collections and results/notes in IndexedDB.
 */
export const createGlobalSearchStrategy = (
  items: { id: string; name: string; category: string; content?: string }[],
  onNavigate: (item: any) => void
): CommandStrategy => ({
  id: 'global-search',
  placeholder: 'Search workouts, results, or collections...',
  
  getResults: async (query: string) => {
    const results: CommandPaletteResult[] = [];
    const lowQuery = query.toLowerCase();

    // 1. Search Collections (Static items)
    const matchedItems = items.filter(item => 
      item.name.toLowerCase().includes(lowQuery) || 
      item.category.toLowerCase().includes(lowQuery)
    );

    matchedItems.slice(0, 10).forEach(item => {
      results.push({
        id: item.id,
        name: item.name,
        category: item.category,
        type: 'workout',
        payload: item
      });
    });

    // 2. Search IndexedDB (Recent Results)
    try {
      const recentResults = await indexedDBService.getRecentResults(50);
      const matchedResults = recentResults.filter(r => {
        const noteName = r.noteId.split('/').pop()?.toLowerCase() || '';
        return noteName.includes(lowQuery) || r.id.toLowerCase().includes(lowQuery);
      });

      matchedResults.slice(0, 5).forEach(r => {
        const date = new Date(r.completedAt).toLocaleDateString();
        const noteName = r.noteId.split('/').pop() || r.noteId;
        results.push({
          id: r.id,
          name: `Result: ${noteName}`,
          category: 'Results',
          subtitle: `${date} · ${r.data?.completed ? 'Completed' : 'Partial'}`,
          type: 'result',
          payload: r
        });
      });
    } catch (e) {
      console.error('Failed to fetch indexedDB results for search', e);
    }

    return results;
  },

  onSelect: (result) => {
    if (result.type === 'workout') {
      onNavigate(result.payload);
    } else if (result.type === 'result') {
      // Navigate to review page
      window.location.hash = `#/review/${result.id}`;
    }
  }
});

/**
 * Strategy 2: Scoped Collection Search
 * Lists all entries under a specific collection.
 */
export const createCollectionStrategy = (
  collectionName: string,
  items: { id: string; name: string; category: string; content?: string }[],
  onNavigate: (item: any) => void
): CommandStrategy => ({
  id: `collection-${collectionName}`,
  placeholder: `Search in ${collectionName}...`,
  
  getResults: async (query: string) => {
    const lowQuery = query.toLowerCase();
    const filtered = items.filter(item => item.category === collectionName);
    
    if (!query) return filtered.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      type: 'workout',
      payload: item
    }));

    return filtered
      .filter(item => item.name.toLowerCase().includes(lowQuery))
      .map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        type: 'workout',
        payload: item
      }));
  },

  onSelect: (result) => {
    onNavigate(result.payload);
  }
});

/**
 * Strategy 3: Statement Builder (Ctrl + .)
 * Contextual information and quick modifications for WOD lines.
 */
export interface StatementBuilderContext {
  line: string;
  segments: string[];
  activeSegmentIndex: number;
  onModifyLine: (newLine: string) => void;
  updateStrategy: (newStrategy: CommandStrategy) => void;
}

export const createStatementBuilderStrategy = (
  context: StatementBuilderContext
): CommandStrategy => ({
  id: 'statement-builder',
  placeholder: `Modify ${context.segments[context.activeSegmentIndex] || 'metric'}...`,
  initialInputValue: '',
  
  renderHeader: () => (
    <div className="flex flex-col border-b border-border">
      <div className="px-4 py-3 bg-primary/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Statement Builder</span>
          <div className="flex gap-2">
             <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-card text-[9px] font-bold text-muted-foreground shadow-sm">
               <kbd className="opacity-50">Tab</kbd> <span>Next Segment</span>
             </span>
          </div>
        </div>
        
        {/* Segments Display */}
        <div className="flex flex-wrap gap-1.5 font-mono text-sm">
          {context.segments.map((seg, i) => (
            <div 
              key={i}
              className={`px-2 py-1 rounded-md border transition-all duration-200 ${
                i === context.activeSegmentIndex 
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-105 z-10' 
                  : 'bg-background text-foreground/60 border-border'
              }`}
            >
              {seg}
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
          {context.activeSegmentIndex === 0 ? 'Repetitions' : context.activeSegmentIndex === 1 ? 'Movement' : 'Load / Intensity'}
        </span>
        <span className="text-[10px] font-medium text-primary/60">Segment {context.activeSegmentIndex + 1} of {context.segments.length}</span>
      </div>
    </div>
  ),

  getResults: async (query: string) => {
    const activeSeg = context.activeSegmentIndex;
    let suggestions: CommandPaletteResult[] = [];

    if (activeSeg === 0) { // Reps
      suggestions = [
        { id: '5', name: '5 reps', category: 'Reps', type: 'statement-part', payload: '5' },
        { id: '10', name: '10 reps', category: 'Reps', type: 'statement-part', payload: '10' },
        { id: '15', name: '15 reps', category: 'Reps', type: 'statement-part', payload: '15' },
        { id: '20', name: '20 reps', category: 'Reps', type: 'statement-part', payload: '20' },
      ];
    } else if (activeSeg === 1) { // Movement
      suggestions = [
        { id: 'kbs', name: 'Kettlebell Swings', category: 'Movement', type: 'statement-part', payload: 'Kettlebell Swings' },
        { id: 'goblet', name: 'Goblet Squats', category: 'Movement', type: 'statement-part', payload: 'Goblet Squats' },
        { id: 'press', name: 'Overhead Press', category: 'Movement', type: 'statement-part', payload: 'Overhead Press' },
        { id: 'snatch', name: 'Kettlebell Snatch', category: 'Movement', type: 'statement-part', payload: 'Kettlebell Snatch' },
      ];
    } else { // Weight
      suggestions = [
        { id: '16kg', name: '16kg', category: 'Weight', type: 'statement-part', payload: '16kg' },
        { id: '20kg', name: '20kg', category: 'Weight', type: 'statement-part', payload: '20kg' },
        { id: '24kg', name: '24kg', category: 'Weight', type: 'statement-part', payload: '24kg' },
        { id: '32kg', name: '32kg', category: 'Weight', type: 'statement-part', payload: '32kg' },
      ];
    }

    if (!query) return suggestions;
    return suggestions.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
  },

  onSelect: (result) => {
    const newSegments = [...context.segments];
    newSegments[context.activeSegmentIndex] = result.payload;
    context.onModifyLine(newSegments.join(' '));
    
    // Automatically move to next segment if not at the end
    if (context.activeSegmentIndex < context.segments.length - 1) {
      context.updateStrategy(createStatementBuilderStrategy({
        ...context,
        segments: newSegments,
        activeSegmentIndex: context.activeSegmentIndex + 1
      }));
    }
  },

  onKeyDown: (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextIndex = (context.activeSegmentIndex + 1) % context.segments.length;
      context.updateStrategy(createStatementBuilderStrategy({
        ...context,
        activeSegmentIndex: nextIndex
      }));
    }
  }
});
