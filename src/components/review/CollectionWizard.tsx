import React, { useState } from 'react';
import { MetricType } from '@/core/models/Metric';
import { type CollectionItem } from '@/hooks/useCollectionMetrics';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CollectionWizardProps {
  items: CollectionItem[];
  onSave: (item: CollectionItem, value: any) => void;
  onSkip: (item: CollectionItem) => void;
  onClose?: () => void;
  mode: 'pre-run' | 'post-run';
  className?: string;
}

const METRIC_ICONS: Record<string, string> = {
  [MetricType.Duration]: '⏱️',
  [MetricType.Rep]: '💪',
  [MetricType.Distance]: '📏',
  [MetricType.Resistance]: '💪',
};

const METRIC_LABELS: Record<string, string> = {
  [MetricType.Duration]: 'Duration',
  [MetricType.Rep]: 'Reps',
  [MetricType.Distance]: 'Distance',
  [MetricType.Resistance]: 'Weight',
};

export const CollectionWizard: React.FC<CollectionWizardProps> = ({
  items,
  onSave,
  onSkip,
  onClose,
  mode,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(mode === 'pre-run');

  if (items.length === 0) return null;

  const currentItem = items[currentIndex];
  const progress = Math.round(((items.length - items.length) / items.length) * 100); // Placeholder for actual progress if tracked externally

  const handleSave = () => {
    if (!inputValue) return;
    onSave(currentItem, inputValue);
    setInputValue('');
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setInputValue('');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setInputValue('');
    }
  };

  const renderInput = () => {
    const placeholder = currentItem.metricType === MetricType.Duration ? 'MM:SS' : 'Value';
    
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

  // Mode B: Post-run banner variant
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
        {/* Item Card */}
        <div className="w-full space-y-6">
          <div className="flex flex-col items-center gap-2">
            <div className="px-3 py-1 rounded-pill bg-metric-effort/15 border border-metric-effort/40 text-metric-effort text-xs font-bold">
              🏃 {currentItem.exerciseLabel}
            </div>
            {(currentItem.roundIndex || currentItem.setIndex) && (
              <div className="text-[10px] font-bold tracking-label uppercase text-muted-foreground">
                {currentItem.roundIndex && `Round ${currentItem.roundIndex}`}
                {currentItem.roundIndex && currentItem.setIndex && " · "}
                {currentItem.setIndex && `Set ${currentItem.setIndex}`}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <span className="text-lg">{METRIC_ICONS[currentItem.metricType] || '📊'}</span>
              <span className="text-sm font-medium uppercase tracking-label">
                {METRIC_LABELS[currentItem.metricType] || 'Metric'}
              </span>
            </div>
            
            {renderInput()}
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
          <button
            onClick={() => onSkip(currentItem)}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={!inputValue}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold shadow-sm hover:brightness-110 disabled:opacity-50 disabled:grayscale transition-all"
          >
            {currentIndex === items.length - 1 ? 'Finish' : 'Save →'}
          </button>
        </div>
      </div>

      {mode === 'pre-run' && (
        <div className="p-4 bg-background border-t border-border mt-auto">
          <button
            onClick={handleSave}
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
