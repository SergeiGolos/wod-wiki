import { RuntimeMetric, StatementNode } from "../timer.types";
import { MetricsRelationshipFactory, MetricsRelationshipType } from "./MetricsRelationship";
import { getEffort } from "../runtime/blocks/readers/getEffort";
import { getRepetitions } from "../runtime/blocks/readers/getRounds";
import { getResistance } from "../runtime/blocks/readers/getResistance";
import { getDistance } from "../runtime/blocks/readers/getDistance";

/**
 * Factory for creating metrics from statement nodes
 * Provides a clean separation between statement structure and runtime representation
 */
export interface IMetricsFactory {
  /**
   * Create metrics from a statement node
   * @param node Statement node to create metrics from
   * @returns Array of metrics
   */
  createFromStatement(node: StatementNode): RuntimeMetric[];

  /**
   * Create metrics from multiple statement nodes
   * @param nodes Statement nodes to create metrics from
   * @returns Array of metrics
   */
  createFromStatements(nodes: StatementNode[]): RuntimeMetric[];

  /**
   * Apply parent metrics to child metrics based on workout logic
   * @param parentMetrics Parent metrics to apply
   * @param childMetrics Child metrics to apply parent context to
   * @returns Updated child metrics
   */
  applyParentContext(parentMetrics: RuntimeMetric[], childMetrics: RuntimeMetric[]): RuntimeMetric[];
}

/**
 * Default implementation of IMetricsFactory
 */
export class MetricsFactory implements IMetricsFactory {
  /**
   * Create metrics from a statement node
   * @param node Statement node to create metrics from
   * @returns Array of metrics
   */
  public createFromStatement(node: StatementNode): RuntimeMetric[] {
    // Create a RuntimeMetric from the source's properties
    const metric: RuntimeMetric = {
      sourceId: node.id.toString(),
      effort: '',
      values: []
    };

    // Get effort
    const efforts = getEffort(node);
    if (efforts.length > 0) {
      metric.effort = efforts.map(e => e.effort).join(' ');
    }

    // Get values
    const repetitions = getRepetitions(node);
    const resistance = getResistance(node);
    const distance = getDistance(node);

    // Add repetitions
    repetitions.forEach(rep => {
      metric.values.push({
        type: 'repetitions',
        value: Number(rep.reps) || 0,
        unit: 'reps'
      });
    });

    // Add resistance
    resistance.forEach(res => {
      metric.values.push({
        type: 'resistance',
        value: parseFloat(res.value) || 0,
        unit: res.units || 'kg'
      });
    });

    // Add distance
    distance.forEach(dist => {
      metric.values.push({
        type: 'distance',
        value: parseFloat(dist.value) || 0,
        unit: dist.units || 'm'
      });
    });

    return metric.values.length > 0 ? [metric] : [];
  }

  /**
   * Create metrics from multiple statement nodes
   * @param nodes Statement nodes to create metrics from
   * @returns Array of metrics
   */
  public createFromStatements(nodes: StatementNode[]): RuntimeMetric[] {
    if (!nodes || nodes.length === 0) {
      return [];
    }

    // Create metrics for each node and merge them by effort name
    const metricsMap: Map<string, RuntimeMetric> = new Map();
    
    // First, collect all metrics by effort name for easier merging
    for (const node of nodes) {
      const nodeMetrics = this.createFromStatement(node);
      
      for (const metric of nodeMetrics) {
        // If we already have metrics for this effort, merge them
        if (metricsMap.has(metric.effort)) {
          const existing = metricsMap.get(metric.effort)!;
          
          // For each value in the new metric, check if it exists in the existing metric
          for (const value of metric.values) {
            const existingValueIndex = existing.values.findIndex(v => v.type === value.type);
            
            if (existingValueIndex >= 0) {
              // If the value type already exists, update it (sum values)
              existing.values[existingValueIndex].value += value.value;
            } else {
              // If the value type doesn't exist, add it
              existing.values.push({...value});
            }
          }
        } else {
          // If we don't have metrics for this effort yet, add it to the map
          metricsMap.set(metric.effort, {...metric});
        }
      }
    }
    
    // Convert the map back to an array
    return Array.from(metricsMap.values());
  }

  /**
   * Apply parent metrics to child metrics based on workout logic using the specified relationship type
   * @param parentMetrics Parent metrics to apply
   * @param childMetrics Child metrics to apply parent context to
   * @param relationshipType Type of relationship between parent and child metrics
   * @returns Updated child metrics
   */
  public applyParentContext(
    parentMetrics: RuntimeMetric[], 
    childMetrics: RuntimeMetric[],
    relationshipType: MetricsRelationshipType = MetricsRelationshipType.INHERIT
  ): RuntimeMetric[] {
    if (!parentMetrics || parentMetrics.length === 0 || !childMetrics || childMetrics.length === 0) {
      return [...childMetrics];
    }

    // Create a relationship object to apply the parent context
    const relationship = MetricsRelationshipFactory.create(relationshipType);
    return relationship.applyRelationship(parentMetrics, childMetrics);
  }
}
