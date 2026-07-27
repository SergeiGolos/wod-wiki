import React, { useState, useEffect } from 'react';
import { MetricType } from '@/core/models/Metric';
import { type CollectionItem, type ChoiceCollectionItem, type ValueCollectionItem } from '@/hooks/useCollectionMetrics';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
interface CollectionWizardProps {
  items: CollectionItem[];
  onSave: (item: CollectionItem, value: any) => void;
  onSkip: (item: CollectionItem) => void;
  onStart?: () => void;
  onClose?: () => void;
  mode: 'pre-run' | 'post-run';
  className?: string;
}
const CollectionWizard: React.FC<CollectionWizardProps> = ({
  items,
  onSave,
  onSkip,
  onStart,
  onClose,
  mode,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  // Per-item selected index for choice items (keyed by item array index, default 0)
  const [choiceSelections, setChoiceSelections] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    items.forEach((item, idx) => { if (item.kind === 'choice') init[idx] = 0; });
    return init;
  });
  const [isExpanded, setIsExpanded] = useState(mode === 'pre-run');
  // Keep currentIndex in bounds when items array changes (e.g., after save removes item)
  useEffect(() => {
    if (currentIndex >= items.length && items.length > 0) {
      setCurrentIndex(items.length - 1);
    }
  }, [items.length, currentIndex]);
  if (items.length === 0) return null;
  const currentItem = items[currentIndex];
  // Defensive: if currentIndex is out of bounds, clamp it
  if (!currentItem) return null;

  const handleSave = () => {
    if (currentItem.kind === 'choice') {
      // No-op: selection tracked in choiceSelections state
    } else {
      if (!inputValue) return;
      onSave(currentItem, inputValue);
      setInputValue('');
    }
    if (currentIndex < items.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleSkip = () => {
    if (currentItem.kind !== 'choice') onSkip(currentItem);
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setInputValue('');
    }
  };

  const handleStart = () => {
    // Flush any pending value-item input
    if (currentItem.kind === 'value' && inputValue) {
      onSave(currentItem, inputValue);
      setInputValue('');
    }
    // Resolve all choice items (first alternative pre-selected, user may have changed)
    items.forEach((item, idx) => {
      if (item.kind === 'choice') {
        onSave(item, choiceSelections[idx] ?? 0);
      }
    });
    onStart?.();
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setInputValue('');
    }
  };

  // ── Choice item renderer ───────────────────────────────────────────────────
  const renderChoiceInput = (item: ChoiceCollectionItem, itemIndex: number) => {
    const selected = choiceSelections[itemIndex] ?? 0;
    return (
      <div className="flex flex-col gap-3 w-full">
        {item.alternatives.map((alt, altIdx) => {
          const isSelected = selected === altIdx;
          const label = alt.image ?? String((alt.value as any)?.amount ?? alt.value ?? altIdx);
          return (
            <button
              key={altIdx}
              onClick={() => {
                // No deselect: clicking an already-selected option is a no-op
                if (!isSelected) {
                  setChoiceSelections(prev => ({ ...prev, [itemIndex]: altIdx }));
                }
              }}
              className={cn(
                'w-full py-4 px-6 rounded-xl border-2 text-lg font-bold transition-all',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border bg-background text-foreground hover:border-primary/50'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  // ── Value item renderer ────────────────────────────────────────────────────
  const renderValueInput = (item: ValueCollectionItem) => {
    const placeholder = item.metricType === MetricType.Duration ? 'MM:SS' : 'Value';
    return (
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className="w-full text-2xl font-bold text-center py-3 bg-background border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all tabular-nums"
      />
    );
  };

  // ── Post-run collapsed banner ──────────────────────────────────────────────
  if (mode === 'post-run' && !isExpanded) {
    return (
      <div className={cn("bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center justify-between", className)}>
        <div className="flex items-center gap-2 text-warning text-sm font-medium">
          <AlertCircle className="w-4 h-4" />
          <span>{items.length} uncollected metrics — fill in your actuals</span>
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="px-3 py-1 bg-warning text-warning-foreground rounded-lg text-xs font-bold uppercase tracking-label hover:brightness-110 transition-all"
        >
          Fill In Now
        </button>
      </div>
    );
  }

  // ── Full wizard ────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      "bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col",
      mode === 'pre-run' ? "fixed inset-0 z-50 md:inset-10" : "relative",
      className
    )}>
      {/* Progress Bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/10">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {mode === 'pre-run' ? 'Set Your Targets' : 'Fill in your actuals'}
          </h2>
          <p className="text-xs text-muted-foreground uppercase tracking-label">
            {currentIndex + 1} of {items.length} metrics
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-8 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <div className="w-full space-y-6">
          <div className="flex flex-col items-center gap-2">
            <div className="px-3 py-1 rounded-pill bg-metric-effort/15 border border-metric-effort/40 text-metric-effort text-xs font-bold">
              🏃 {currentItem.exerciseLabel}
            </div>
            {(currentItem.setIndex || currentItem.roundIndex) && (
              <div className="text-[10px] font-bold tracking-label uppercase text-muted-foreground">
                {currentItem.roundIndex && `Round ${currentItem.roundIndex}`}
                {currentItem.roundIndex && currentItem.setIndex && ' · '}
                {currentItem.setIndex && `Set ${currentItem.setIndex}`}
              </div>
            )}
            {currentItem.kind === 'choice' && (
              <div className="text-sm text-muted-foreground font-medium">Choose one:</div>
            )}
          </div>

          <div className="space-y-4">
            {currentItem.kind === 'choice'
              ? renderChoiceInput(currentItem, currentIndex)
              : renderValueInput(currentItem)
            }
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/10">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          {currentItem.kind === 'value' && (
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>
          )}
          {currentIndex < items.length - 1 && (
            <button
              onClick={handleSave}
              disabled={currentItem.kind === 'value' && !inputValue}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold shadow-sm hover:brightness-110 disabled:opacity-50 disabled:grayscale transition-all"
            >
              Next →
            </button>
          )}
        </div>
      </div>

      {/* Start Workout — always enabled (choices are pre-selected) */}
      {mode === 'pre-run' && (
        <div className="p-4 bg-background border-t border-border mt-auto">
          <button
            onClick={handleStart}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            Start Workout
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export { CollectionWizard };
