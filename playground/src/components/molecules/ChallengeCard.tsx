/**
 * ChallengeCard — single quest status card used inline in prose and in
 * the header dropdown. Presentational: state is supplied by the caller.
 */

import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Check } from 'lucide-react';
import type { Quest } from '../../canvas/parseCanvasMarkdown';
import type { ValidationResult } from '../../services/syntaxChallengeValidator';
import { cn } from '@/lib/utils';
import { useProtoVariant } from '../../proto/ProtoVariantSwitch';
import {
  BasicsMovementIcon,
  BasicsRepsIcon,
  BasicsLoadIcon,
  StructureRoundsIcon,
  StructureRepSchemeIcon,
  ProtocolsTimerBadge,
  ProtocolsTagIcon,
  MetricsCustomIcon,
  MetricsCalcIcon,
  DialectsLogIcon,
} from '../ChallengeBadges';

function getQuestIcon(id: string): React.ComponentType<React.SVGProps<SVGSVGElement>> | null {
  switch (id) {
    case 'basics-movement':
      return BasicsMovementIcon;
    case 'basics-reps':
      return BasicsRepsIcon;
    case 'basics-load':
      return BasicsLoadIcon;
    case 'structure-rounds':
    case 'complex-rounds':
    case 'protocols-rounds':
      return StructureRoundsIcon;
    case 'structure-repscheme':
      return StructureRepSchemeIcon;
    case 'protocols-timer':
    case 'complex-time':
      return ProtocolsTimerBadge;
    case 'protocols-tag':
      return ProtocolsTagIcon;
    case 'metrics-custom':
      return MetricsCustomIcon;
    case 'metrics-calc':
      return MetricsCalcIcon;
    case 'dialects-log':
    case 'dialects-climb':
      return DialectsLogIcon;
    default:
      return null;
  }
}

export interface ChallengeCardProps {
  quest: Quest & { isCompleted: boolean; result?: ValidationResult };
  onClick?: () => void;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
}

export function ChallengeCard({ quest, onClick, className, compact = false, disabled = false }: ChallengeCardProps) {
  const Icon = getQuestIcon(quest.id);
  const { proto } = useProtoVariant();
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
  }, [quest.id]);

  const hint = quest.isCompleted
    ? 'Challenge complete.'
    : quest.result
      ? quest.result.pass
        ? `Ready — ${quest.result.detail ?? 'looks good'}`
        : quest.result.reason ?? 'Open the editor to begin.'
      : 'Open the editor to begin.';

  // PROTOTYPE — throwaway: hints show in compact cards too; compact cards are
  // the primary quest surface (home banner), gating them out hides the feature.
  const showHints = proto && !quest.isCompleted && quest.hints && quest.hints.length > 0;
  const hints = quest.hints ?? [];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={`challenge-row-${quest.id}`}
      data-completed={quest.isCompleted ? 'true' : 'false'}
      className={cn(
        'w-full text-left flex items-start gap-3 rounded-xl border px-3 py-2 text-sm transition-colors',
        quest.isCompleted
          ? 'border-primary/40 bg-primary/5'
          : 'border-border/50 bg-background/60',
        onClick && !disabled && 'cursor-pointer hover:bg-background/80',
        disabled && 'opacity-60 cursor-default',
        compact && 'px-2.5 py-1.5',
        className,
      )}
    >
      {Icon ? (
        <span className={cn('relative shrink-0 mt-0.5', compact ? 'size-5' : 'size-6')}>
          <Icon className="w-full h-full" />
          {quest.isCompleted && (
            <span className="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 text-white border border-background shadow">
              <Check className="size-2" strokeWidth={3} />
            </span>
          )}
        </span>
      ) : (
        <span
          className={cn(
            'mt-0.5 shrink-0',
            quest.isCompleted ? 'text-primary' : 'text-muted-foreground/50',
          )}
          aria-hidden="true"
        >
          {quest.isCompleted ? (
            <CheckCircle2 className={compact ? 'size-3.5' : 'size-4'} />
          ) : (
            <Circle className={compact ? 'size-3.5' : 'size-4'} />
          )}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-semibold',
            quest.isCompleted
              ? 'text-foreground line-through decoration-primary/40'
              : 'text-foreground',
            compact && 'text-xs',
          )}
        >
          {quest.label}
        </p>
        {quest.desc && !compact && (
          <p className="mt-0.5 text-xs text-muted-foreground">{quest.desc}</p>
        )}
        <p
          data-testid={`challenge-hint-${quest.id}`}
          className={cn(
            'mt-1 text-xs',
            quest.isCompleted
              ? 'text-primary/80'
              : quest.result?.pass
                ? 'text-primary/80'
                : 'text-muted-foreground',
          )}
        >
          {hint}
        </p>
        {showHints && (
          <div className="mt-2 space-y-1">
            {hints.slice(0, revealed).map((h, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {h}
              </p>
            ))}
            {revealed < hints.length && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setRevealed((r) => r + 1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    setRevealed((r) => r + 1);
                  }
                }}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-border/60 px-2 py-1',
                  'text-xs font-medium text-muted-foreground hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring',
                )}
              >
                💡 Hint ({revealed + 1}/{hints.length})
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
