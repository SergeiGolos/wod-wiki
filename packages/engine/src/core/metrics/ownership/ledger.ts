import type { IMetric } from '../../models/Metric';
import {
  getMetricOwnershipLayer,
  METRIC_OWNERSHIP_LAYER_CHAIN,
  type MetricOwnershipLayer,
  type MetricOwnershipLedger,
  type MetricOwnershipPromotionCandidate,
  type MetricOwnershipQuery,
  type MetricOwnershipResolvedContribution,
  type MetricOwnershipTypeExplanation,
  type MetricWithOptionalOwnershipLayer,
} from './types';

interface OwnershipContribution {
  readonly metric: IMetric;
  readonly type: IMetric['type'];
  readonly layer: MetricOwnershipLayer;
  readonly layerRank: number;
  readonly index: number;
  readonly isSuppressor: boolean;
}

const LAYER_RANK: Record<MetricOwnershipLayer, number> = {
  parser: 0,
  dialect: 1,
  'user-plan': 2,
  runtime: 3,
  'user-entry': 4,
};

function resolveLayer(metric: IMetric): MetricOwnershipLayer {
  const maybeLayer = (metric as MetricWithOptionalOwnershipLayer).ownershipLayer;
  if (maybeLayer != null) {
    return maybeLayer;
  }
  return getMetricOwnershipLayer(metric.origin);
}

function normalize(metrics: readonly IMetric[]): OwnershipContribution[] {
  return metrics.map((metric, index) => {
    const layer = resolveLayer(metric);
    return {
      metric,
      type: metric.type,
      layer,
      layerRank: LAYER_RANK[layer],
      index,
      isSuppressor: metric.action === 'suppress',
    };
  });
}

function applyQuery(
  contributions: readonly OwnershipContribution[],
  query?: MetricOwnershipQuery,
): OwnershipContribution[] {
  if (!query) {
    return [...contributions];
  }

  return contributions.filter((contribution) => {
    if (query.types && !query.types.includes(contribution.type)) {
      return false;
    }
    if (query.layers && !query.layers.includes(contribution.layer)) {
      return false;
    }
    return true;
  });
}

function groupByType(contributions: readonly OwnershipContribution[]): Map<IMetric['type'], OwnershipContribution[]> {
  const grouped = new Map<IMetric['type'], OwnershipContribution[]>();
  for (const contribution of contributions) {
    const bucket = grouped.get(contribution.type);
    if (bucket) {
      bucket.push(contribution);
      continue;
    }
    grouped.set(contribution.type, [contribution]);
  }
  return grouped;
}

function getWinningLayerRank(contributions: readonly OwnershipContribution[]): number | undefined {
  let winningLayerRank: number | undefined;
  for (const contribution of contributions) {
    if (contribution.isSuppressor) {
      continue;
    }
    if (winningLayerRank == null || contribution.layerRank > winningLayerRank) {
      winningLayerRank = contribution.layerRank;
    }
  }
  return winningLayerRank;
}

function toResolvedContribution(
  contribution: OwnershipContribution,
  outcome: MetricOwnershipResolvedContribution['outcome'],
): MetricOwnershipResolvedContribution {
  return {
    metric: contribution.metric,
    type: contribution.type,
    layer: contribution.layer,
    outcome,
  };
}

function compareByOriginalIndex(a: OwnershipContribution, b: OwnershipContribution): number {
  return a.index - b.index;
}

export function createMetricOwnershipLedger(metrics: readonly IMetric[]): MetricOwnershipLedger {
  const contributions = normalize(metrics);

  return {
    raw(query) {
      return applyQuery(contributions, query).map((contribution) => contribution.metric);
    },

    visible(query) {
      const filtered = applyQuery(contributions, query);
      const grouped = groupByType(filtered);
      const visible: OwnershipContribution[] = [];

      for (const groupedContributions of grouped.values()) {
        if (groupedContributions.some((contribution) => contribution.isSuppressor)) {
          continue;
        }

        const winningLayerRank = getWinningLayerRank(groupedContributions);
        if (winningLayerRank == null) {
          continue;
        }

        for (const contribution of groupedContributions) {
          if (!contribution.isSuppressor && contribution.layerRank === winningLayerRank) {
            visible.push(contribution);
          }
        }
      }

      visible.sort(compareByOriginalIndex);
      return visible.map((contribution) => contribution.metric);
    },

    byLayer(query) {
      const filtered = applyQuery(contributions, query);
      const grouped: Partial<Record<MetricOwnershipLayer, IMetric[]>> = {};

      for (const layer of METRIC_OWNERSHIP_LAYER_CHAIN) {
        grouped[layer] = [];
      }

      for (const contribution of filtered) {
        grouped[contribution.layer]!.push(contribution.metric);
      }

      for (const layer of METRIC_OWNERSHIP_LAYER_CHAIN) {
        if (grouped[layer]?.length === 0) {
          delete grouped[layer];
        }
      }

      return grouped;
    },

    promotionCandidates(query) {
      const filtered = applyQuery(contributions, query);
      const grouped = groupByType(filtered);
      const candidates: MetricOwnershipPromotionCandidate[] = [];

      for (const groupedContributions of grouped.values()) {
        const suppressors = groupedContributions.filter((contribution) => contribution.isSuppressor);
        const nonSuppressors = groupedContributions.filter((contribution) => !contribution.isSuppressor);

        if (nonSuppressors.length === 0) {
          continue;
        }

        if (suppressors.length > 0) {
          const highestCandidateRank = Math.max(...nonSuppressors.map((contribution) => contribution.layerRank));
          const suppressingLayerRank = Math.max(...suppressors.map((contribution) => contribution.layerRank));

          for (const contribution of nonSuppressors) {
            if (contribution.layerRank === highestCandidateRank) {
              candidates.push({
                metric: contribution.metric,
                type: contribution.type,
                layer: contribution.layer,
                reason: 'suppressed',
                blockedByLayer: METRIC_OWNERSHIP_LAYER_CHAIN[suppressingLayerRank],
              });
            }
          }
          continue;
        }

        const winningLayerRank = getWinningLayerRank(nonSuppressors);
        if (winningLayerRank == null) {
          continue;
        }

        const lowerLayerContributions = nonSuppressors.filter(
          (contribution) => contribution.layerRank < winningLayerRank,
        );

        if (lowerLayerContributions.length === 0) {
          continue;
        }

        const promotionLayerRank = Math.max(...lowerLayerContributions.map((contribution) => contribution.layerRank));

        for (const contribution of lowerLayerContributions) {
          if (contribution.layerRank === promotionLayerRank) {
            candidates.push({
              metric: contribution.metric,
              type: contribution.type,
              layer: contribution.layer,
              reason: 'shadowed-by-higher-layer',
              blockedByLayer: METRIC_OWNERSHIP_LAYER_CHAIN[winningLayerRank],
            });
          }
        }
      }

      candidates.sort((a, b) => {
        const rankDelta = LAYER_RANK[b.layer] - LAYER_RANK[a.layer];
        if (rankDelta !== 0) {
          return rankDelta;
        }
        return 0;
      });
      return candidates;
    },

    explain(query) {
      const filtered = applyQuery(contributions, query);
      const grouped = groupByType(filtered);
      const explanations: MetricOwnershipTypeExplanation[] = [];

      for (const [type, groupedContributions] of grouped.entries()) {
        const suppressed = groupedContributions.some((contribution) => contribution.isSuppressor);
        const winningLayerRank = suppressed ? undefined : getWinningLayerRank(groupedContributions);

        const entries = groupedContributions.map((contribution) => {
          if (contribution.isSuppressor) {
            return toResolvedContribution(contribution, 'suppressor');
          }
          if (suppressed) {
            return toResolvedContribution(contribution, 'hidden-by-suppressor');
          }
          if (winningLayerRank != null && contribution.layerRank === winningLayerRank) {
            return toResolvedContribution(contribution, 'visible');
          }
          return toResolvedContribution(contribution, 'hidden-by-layer');
        });

        explanations.push({
          type,
          winnerLayer: winningLayerRank == null ? undefined : METRIC_OWNERSHIP_LAYER_CHAIN[winningLayerRank],
          suppressed,
          entries,
        });
      }

      return explanations;
    },
  };
}
