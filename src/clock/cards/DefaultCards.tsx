import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, ChartLine, Bed } from '@phosphor-icons/react';
import { CardComponentProps } from '../registry/CardComponentRegistry';
import { cn } from '@/lib/utils';

/**
 * Idle Start Card - Shown when workout hasn't started yet.
 * 
 * Displays a "Start Workout" message with optional workout details.
 */
export const IdleStartCard: React.FC<CardComponentProps> = ({
  entry,
  onButtonClick
}) => {
  const handleStart = () => {
    onButtonClick?.('workout:start');
  };

  return (
    <Card className="w-full bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Play size={32} weight="fill" className="text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {entry.title || 'Ready to Start'}
            </h2>
            {entry.subtitle && (
              <p className="text-muted-foreground">{entry.subtitle}</p>
            )}
          </div>

          {/* Display any buttons from the entry */}
          <div className="flex justify-center gap-3">
            {entry.buttons && entry.buttons.length > 0 ? (
              entry.buttons.map((button) => (
                <Button
                  key={button.id}
                  variant={button.variant === 'primary' ? 'default' : button.variant as any || 'outline'}
                  size="lg"
                  onClick={() => onButtonClick?.(button.eventName, button.payload)}
                >
                  {button.label}
                </Button>
              ))
            ) : (
              <Button size="lg" onClick={handleStart} className="px-8">
                <Play size={20} className="mr-2" />
                Start Session
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Idle Complete Card - Shown when workout has finished.
 * 
 * Displays completion message with option to view analytics.
 */
export const IdleCompleteCard: React.FC<CardComponentProps> = ({
  entry,
  onButtonClick
}) => {
  const handleViewAnalytics = () => {
    onButtonClick?.('workout:view-analytics');
  };

  return (
    <Card className="w-full bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <ChartLine size={32} weight="fill" className="text-green-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {entry.title || 'Session Complete!'}
            </h2>
            {entry.subtitle && (
              <p className="text-muted-foreground">{entry.subtitle}</p>
            )}
          </div>

          <div className="flex justify-center gap-3">
            {entry.buttons && entry.buttons.length > 0 ? (
              entry.buttons.map((button) => (
                <Button
                  key={button.id}
                  variant={button.variant === 'primary' ? 'default' : button.variant as any || 'outline'}
                  size="lg"
                  onClick={() => onButtonClick?.(button.eventName, button.payload)}
                >
                  {button.label}
                </Button>
              ))
            ) : (
              <Button size="lg" onClick={handleViewAnalytics} className="px-8">
                <ChartLine size={20} className="mr-2" />
                View Analytics
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Active Block Card - Shows current block metrics.
 * 
 * Displays the active effort/exercise with its metrics
 * in a format similar to ParsedView rows.
 */
export const ActiveBlockCard: React.FC<CardComponentProps> = ({
  entry,
  onButtonClick
}) => {
  const metrics = entry.metrics || [];

  // Separate buttons: "Next" goes with metrics, others go below
  const nextButton = entry.buttons?.find(b => b.id === 'btn-next' || b.label === 'Next');
  const otherButtons = entry.buttons?.filter(b => b.id !== 'btn-next' && b.label !== 'Next') || [];

  // Get color classes for metric types
  const getMetricColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      'reps': 'bg-blue-100 text-blue-800 border-blue-200',
      'rep': 'bg-blue-100 text-blue-800 border-blue-200',
      'effort': 'bg-green-100 text-green-800 border-green-200',
      'weight': 'bg-purple-100 text-purple-800 border-purple-200',
      'resistance': 'bg-purple-100 text-purple-800 border-purple-200',
      'distance': 'bg-orange-100 text-orange-800 border-orange-200',
      'timer': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'duration': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'rounds': 'bg-pink-100 text-pink-800 border-pink-200',
      'rest': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colorMap[type.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Get icon for metric types
  const getMetricIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      'reps': '×',
      'rep': '×',
      'effort': '🏃',
      'weight': '💪',
      'resistance': '💪',
      'distance': '📏',
      'timer': '⏱️',
      'duration': '⏱️',
      'rounds': '🔄',
      'rest': '⏸️',
    };
    return iconMap[type.toLowerCase()] || '';
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Row: Metrics + Next Button */}
      <div className="flex items-center justify-between gap-4">
        {/* Metrics Display */}
        <div className="flex-1">
          {metrics.length > 0 ? (
            <div className="flex flex-wrap gap-2 justify-center">
              {metrics.map((metric, index) => (
                <span
                  key={index}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 rounded-md border font-mono text-sm bg-background',
                    getMetricColor(metric.type),
                    metric.isActive && 'ring-2 ring-primary ring-offset-1'
                  )}
                  title={`${metric.type}: ${metric.value}`}
                >
                  {getMetricIcon(metric.type) && (
                    <span className="text-base leading-none">
                      {getMetricIcon(metric.type)}
                    </span>
                  )}
                  <span className="font-medium">
                    {metric.image || String(metric.value)}
                  </span>
                  {metric.unit && (
                    <span className="text-xs opacity-70">{metric.unit}</span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-2">
              {entry.title || 'Current Exercise'}
            </div>
          )}
        </div>

        {/* Next Button */}
        {nextButton && (
          <Button
            key={nextButton.id}
            variant={nextButton.variant === 'primary' ? 'default' : nextButton.variant as any || 'outline'}
            size="lg"
            className="shrink-0"
            onClick={() => onButtonClick?.(nextButton.eventName, nextButton.payload)}
          >
            {nextButton.label}
          </Button>
        )}
      </div>

      {/* Bottom Row: Other Buttons (Play, End, etc.) */}
      {otherButtons.length > 0 && (
        <div className="flex justify-center gap-3">
          {otherButtons.map((button) => (
            <Button
              key={button.id}
              variant={button.variant === 'primary' ? 'default' : button.variant as any || 'outline'}
              size="lg"
              onClick={() => onButtonClick?.(button.eventName, button.payload)}
            >
              {button.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Rest Period Card - Shown during rest periods.
 * 
 * Displays rest period info with optional skip button.
 */
export const RestPeriodCard: React.FC<CardComponentProps> = ({
  entry,
  onButtonClick
}) => {
  return (
    <Card className="w-full bg-gradient-to-br from-slate-500/5 to-slate-500/10 border-slate-500/20">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center">
              <Bed size={24} className="text-slate-500" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-foreground">
              {entry.title || 'Rest'}
            </h3>
            {entry.subtitle && (
              <p className="text-sm text-muted-foreground">{entry.subtitle}</p>
            )}
          </div>

          {entry.buttons && entry.buttons.length > 0 && (
            <div className="flex justify-center gap-3">
              {entry.buttons.map((button) => (
                <Button
                  key={button.id}
                  variant={button.variant === 'primary' ? 'default' : button.variant as any || 'ghost'}
                  size="sm"
                  onClick={() => onButtonClick?.(button.eventName, button.payload)}
                >
                  {button.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Fallback Card - Used when no component is registered for a card type.
 */
export const FallbackCard: React.FC<CardComponentProps> = ({ entry }) => {
  return (
    <Card className="w-full border-dashed">
      <CardContent className="p-6">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Unknown card type: {entry.type}</p>
          {entry.componentId && (
            <p className="text-xs">Component ID: {entry.componentId}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
