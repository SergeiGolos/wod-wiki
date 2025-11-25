/**
 * WodBlockCard - Preview/Edit component for WOD block cards
 * 
 * Supports two display modes:
 * - full-preview: Shows parsed statements with Start button
 * - side-by-side: Shows raw code on left, preview on right
 */

import React from 'react';
import { WodBlockContent, WodBlockCardProps } from '../types';
import { StatementDisplay } from '../../../components/fragments/StatementDisplay';
import { Button } from '../../../components/ui/button';
import { Play, Timer, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const WodBlockCard: React.FC<WodBlockCardProps> = ({ card, callbacks }) => {
  const content = card.content as WodBlockContent;
  const { statements, rawCode, parseState } = content;
  const { displayMode } = card;
  
  const hasStatements = statements && statements.length > 0;
  
  const ParseStateBadge = () => (
    <span className={cn(
      "text-[10px] px-1.5 py-0.5 rounded-full",
      parseState === 'parsed' 
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : parseState === 'error'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    )}>
      {parseState}
    </span>
  );
  
  const StatementsPreview = () => (
    <div className="space-y-1.5">
      {hasStatements ? (
        statements.map((statement, idx) => (
          <StatementDisplay key={idx} statement={statement} compact />
        ))
      ) : (
        <div className="text-sm text-muted-foreground italic text-center py-4 flex items-center justify-center gap-2">
          {parseState === 'error' ? (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">Parse error</span>
            </>
          ) : (
            'No statements'
          )}
        </div>
      )}
    </div>
  );
  
  const StartButton = () => (
    <Button 
      className="w-full gap-2" 
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        callbacks.onAction('start-workout');
      }}
      disabled={parseState !== 'parsed'}
    >
      <Play className="h-4 w-4" />
      Start Workout
    </Button>
  );
  
  if (displayMode === 'side-by-side') {
    return (
      <div className="wod-card-split grid grid-cols-2 gap-0 h-full border border-border rounded-lg overflow-hidden bg-card shadow-sm">
        {/* Left: Raw code */}
        <div className="wod-card-source border-r border-border flex flex-col bg-muted/10">
          <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Code</span>
            </div>
            <button
              onClick={callbacks.onEdit}
              className="px-2 py-0.5 rounded hover:bg-muted/50 transition-colors text-xs text-muted-foreground hover:text-foreground"
            >
              Edit
            </button>
          </div>
          <pre 
            className="flex-1 p-3 text-xs font-mono whitespace-pre-wrap cursor-pointer hover:bg-muted/20 transition-colors overflow-auto"
            onClick={callbacks.onEdit}
            title="Click to edit"
          >
            {rawCode}
          </pre>
        </div>
        
        {/* Right: Preview */}
        <div className="wod-card-preview flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-gradient-to-r from-primary/10 to-transparent flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Preview</span>
            <ParseStateBadge />
          </div>
          
          <div className="flex-1 p-3 overflow-auto">
            <StatementsPreview />
          </div>
          
          {parseState === 'parsed' && hasStatements && (
            <div className="p-3 border-t border-border">
              <StartButton />
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Full preview mode
  return (
    <div 
      className="wod-card-preview p-4 rounded-lg border border-border bg-card cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
      onClick={callbacks.onEdit}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Timer className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">Workout</span>
        <ParseStateBadge />
      </div>
      
      {/* Statements */}
      <div className="mb-4">
        <StatementsPreview />
      </div>
      
      {/* Start button */}
      {parseState === 'parsed' && hasStatements && (
        <StartButton />
      )}
    </div>
  );
};
