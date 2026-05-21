/**
 * EffortCard — compact catalog card for an effort entry.
 */

import React from 'react';
import type { IEffort } from '@/effort-registry';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Flame, Activity } from 'lucide-react';

interface EffortCardProps {
  effort: IEffort;
  onClick?: () => void;
}

function OriginBadge({ source }: { source: IEffort['registrySource'] }) {
  switch (source) {
    case 'bundled':
      return (
        <Badge variant="secondary" className="text-[10px]">
          Bundled
        </Badge>
      );
    case 'user':
      return (
        <Badge variant="default" className="text-[10px]">
          Custom
        </Badge>
      );
    case 'synthetic-unresolved':
      return (
        <Badge variant="outline" className="text-[10px]">
          Estimated
        </Badge>
      );
    default:
      return null;
  }
}

function IntensityIcon({ tier }: { tier?: string }) {
  switch (tier) {
    case 'high':
      return <Flame className="size-3.5 text-orange-500" />;
    case 'moderate':
      return <Activity className="size-3.5 text-yellow-500" />;
    case 'low':
      return <Activity className="size-3.5 text-green-500" />;
    default:
      return <Dumbbell className="size-3.5 text-muted-foreground" />;
  }
}

export const EffortCard = React.memo(function EffortCard({ effort, onClick }: EffortCardProps) {
  const { label, slug, baseAttributes, registrySource, aliases } = effort;
  const { met, discipline, intensityTier } = baseAttributes;

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors group"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {label}
            </h3>
            <p className="text-xs text-muted-foreground font-mono truncate">{slug}</p>
          </div>
          <OriginBadge source={registrySource} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {discipline && (
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {discipline}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <IntensityIcon tier={intensityTier} />
            MET {met.toFixed(1)}
          </span>
          {intensityTier && (
            <span className="text-[10px] font-medium capitalize text-muted-foreground">
              {intensityTier}
            </span>
          )}
        </div>

        {aliases.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {aliases.slice(0, 4).map(alias => (
              <span
                key={alias}
                className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded"
              >
                {alias}
              </span>
            ))}
            {aliases.length > 4 && (
              <span className="text-[10px] text-muted-foreground">
                +{aliases.length - 4}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
