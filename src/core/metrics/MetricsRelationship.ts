import { RuntimeMetric } from "../RuntimeMetric";

/**
 * Types of relationships between parent and child blocks for metrics inheritance
 */
export enum MetricsRelationshipType {
  /**
   * No relationship - child metrics are independent from parent
   */
  NONE = "none",
  
  /**
   * Inheritance - child inherits parent metrics (default)
   */
  INHERIT = "inherit",
  
  /**
   * Multiplicative - parent metrics multiply child metrics (e.g., rounds)
   */
  MULTIPLY = "multiply",
  
  /**
   * Additive - parent metrics are added to child metrics
   */
  ADD = "add",
  
  /**
   * Overriding - parent metrics completely override child metrics
   */
  OVERRIDE = "override"
}

/**
 * Interface for defining relationships between parent and child blocks
 */
export interface IMetricsRelationship {
  /**
   * Apply the relationship between parent and child metrics
   * @param parentMetrics The parent metrics
   * @param childMetrics The child metrics
   * @returns The computed child metrics after applying the relationship
   */
  applyRelationship(
    parentMetrics: RuntimeMetric[],
    childMetrics: RuntimeMetric[]
  ): RuntimeMetric[];
}

/**
 * Base class for metrics relationships
 */
export abstract class MetricsRelationshipBase implements IMetricsRelationship {
  constructor(protected type: MetricsRelationshipType) {}
  
  public abstract applyRelationship(
    parentMetrics: RuntimeMetric[],
    childMetrics: RuntimeMetric[]
  ): RuntimeMetric[];
  
  /**
   * Get the relationship type
   */
  public getType(): MetricsRelationshipType {
    return this.type;
  }
}

/**
 * No relationship - child metrics are independent from parent
 */
export class NoneRelationship extends MetricsRelationshipBase {
  constructor() {
    super(MetricsRelationshipType.NONE);
  }
  
  public applyRelationship(
    _parentMetrics: RuntimeMetric[],
    childMetrics: RuntimeMetric[]
  ): RuntimeMetric[] {
    return [...childMetrics];
  }
}

/**
 * Inheritance relationship - child inherits parent metrics
 */
export class InheritRelationship extends MetricsRelationshipBase {
  constructor() {
    super(MetricsRelationshipType.INHERIT);
  }
  
  public applyRelationship(
    parentMetrics: RuntimeMetric[],
    childMetrics: RuntimeMetric[]
  ): RuntimeMetric[] {
    if (!parentMetrics || parentMetrics.length === 0) {
      return [...childMetrics];
    }
    
    // Use a Map to efficiently merge metrics by effort name
    const metricsMap = new Map<string, RuntimeMetric>();
    
    // First, add all child metrics to the map
    for (const childMetric of childMetrics) {
      metricsMap.set(childMetric.effort, {...childMetric});
    }
    
    // Then, merge parent metrics into child metrics
    for (const parentMetric of parentMetrics) {
      if (metricsMap.has(parentMetric.effort)) {
        // If the effort already exists, merge the values
        const existing = metricsMap.get(parentMetric.effort)!;
        
        // Process each value in the parent metric
        for (const parentValue of parentMetric.values) {
          const existingValueIndex = existing.values.findIndex(v => v.type === parentValue.type);
          
          if (existingValueIndex < 0) {
            // If the child doesn't have this value type, add it
            existing.values.push({...parentValue});
          }
          // For INHERIT relationship, we don't sum values - child values take precedence
          // Other relationship types (ADD, MULTIPLY) handle this differently
        }
      } else {
        // If this effort doesn't exist in the child, add the parent metric
        metricsMap.set(parentMetric.effort, {...parentMetric});
      }
    }
    
    // Convert the map back to an array and return
    return Array.from(metricsMap.values());
  }
}

/**
 * Multiplicative relationship - parent metrics multiply child metrics
 * Useful for repeating rounds where child repetitions are multiplied by parent rounds
 */
export class MultiplyRelationship extends MetricsRelationshipBase {
  constructor() {
    super(MetricsRelationshipType.MULTIPLY);
  }
  
  public applyRelationship(
    parentMetrics: RuntimeMetric[],
    childMetrics: RuntimeMetric[]
  ): RuntimeMetric[] {
    if (!parentMetrics || parentMetrics.length === 0 || !childMetrics || childMetrics.length === 0) {
      return [...childMetrics];
    }
    
    // Use a Map to efficiently merge metrics by effort name
    const metricsMap = new Map<string, RuntimeMetric>();
    
    // First, add all child metrics to the map
    for (const childMetric of childMetrics) {
      metricsMap.set(childMetric.effort, {...childMetric});
    }
    
    // Find any repetition values in parent metrics
    const parentReps = parentMetrics.flatMap(pm => 
      pm.values.filter(v => v.type === 'repetitions')
    );
    
    // If we have parent repetitions, apply them as multipliers to child repetitions
    if (parentReps.length > 0) {
      const totalParentReps = parentReps.reduce((sum, rep) => sum + rep.value, 0);
      
      // Only apply if we have a non-zero parent rep count
      if (totalParentReps > 0) {
        for (const [_, childMetric] of metricsMap.entries()) {
          // Find repetition values in the child metric
          const repIndex = childMetric.values.findIndex(v => v.type === 'repetitions');
          
          if (repIndex >= 0) {
            // Multiply the child repetition by the parent repetition
            childMetric.values[repIndex].value *= totalParentReps;
          }
        }
      }
    }
    
    // Convert the map back to an array and return
    return Array.from(metricsMap.values());
  }
}

/**
 * Additive relationship - parent metrics are added to child metrics
 * Useful for incremental workouts where child metrics accumulate
 */
export class AddRelationship extends MetricsRelationshipBase {
  constructor() {
    super(MetricsRelationshipType.ADD);
  }
  
  public applyRelationship(
    parentMetrics: RuntimeMetric[],
    childMetrics: RuntimeMetric[]
  ): RuntimeMetric[] {
    if (!parentMetrics || parentMetrics.length === 0) {
      return [...childMetrics];
    }
    
    // Use a Map to efficiently merge metrics by effort name
    const metricsMap = new Map<string, RuntimeMetric>();
    
    // First, add all child metrics to the map
    for (const childMetric of childMetrics) {
      metricsMap.set(childMetric.effort, {...childMetric});
    }
    
    // For each parent metric, add its values to matching child metrics or add new metrics
    for (const parentMetric of parentMetrics) {
      if (metricsMap.has(parentMetric.effort)) {
        // Found a matching child metric, add parent values to it
        const childMetric = metricsMap.get(parentMetric.effort)!;
        
        for (const parentValue of parentMetric.values) {
          const childValueIndex = childMetric.values.findIndex(cv => cv.type === parentValue.type);
          
          if (childValueIndex >= 0) {
            // Found a matching value type, add the parent value to it
            childMetric.values[childValueIndex].value += parentValue.value;
          } else {
            // No matching value type, add the parent value as a new value
            childMetric.values.push({...parentValue});
          }
        }
      } else {
        // No matching child metric, add the parent metric
        metricsMap.set(parentMetric.effort, {...parentMetric});
      }
    }
    
    // Convert the map back to an array and return
    return Array.from(metricsMap.values());
  }
}

/**
 * Override relationship - parent metrics completely override child metrics
 */
export class OverrideRelationship extends MetricsRelationshipBase {
  constructor() {
    super(MetricsRelationshipType.OVERRIDE);
  }
  
  public applyRelationship(
    parentMetrics: RuntimeMetric[],
    childMetrics: RuntimeMetric[]
  ): RuntimeMetric[] {
    if (!parentMetrics || parentMetrics.length === 0) {
      return [...childMetrics];
    }
    
    // Use a Map to efficiently merge metrics by effort name
    const metricsMap = new Map<string, RuntimeMetric>();
    
    // First, add all child metrics to the map
    for (const childMetric of childMetrics) {
      metricsMap.set(childMetric.effort, {...childMetric});
    }
    
    // For each parent metric, override matching child metrics
    for (const parentMetric of parentMetrics) {
      // Override any matching child metric with the parent metric
      metricsMap.set(parentMetric.effort, {...parentMetric});
    }
    
    // Convert the map back to an array and return
    return Array.from(metricsMap.values());
  }
}

/**
 * Factory for creating metrics relationship objects
 */
export class MetricsRelationshipFactory {
  /**
   * Create a metrics relationship
   * @param type The type of relationship to create
   * @returns The created relationship
   */
  public static create(type: MetricsRelationshipType): IMetricsRelationship {
    switch (type) {
      case MetricsRelationshipType.NONE:
        return new NoneRelationship();
      case MetricsRelationshipType.INHERIT:
        return new InheritRelationship();
      case MetricsRelationshipType.MULTIPLY:
        return new MultiplyRelationship();
      case MetricsRelationshipType.ADD:
        return new AddRelationship();
      case MetricsRelationshipType.OVERRIDE:
        return new OverrideRelationship();
      default:
        return new InheritRelationship();
    }
  }
}
