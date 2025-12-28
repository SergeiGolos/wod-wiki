import { ICodeFragment } from '../core/models/CodeFragment';
import { MetricBehavior } from '../types/MetricBehavior';

/**
 * Interface for fragment-based metric collection subsystem.
 * 
 * This is the new fragment-based collector that will replace RuntimeMetric-based
 * collection in Phase 2 of the metrics consolidation.
 * 
 * Fragments are collected during workout execution and made available for
 * analysis after the workout completes.
 */
export interface IFragmentMetricCollector {
  /**
   * Collect a fragment metric during workout execution.
   * 
   * @param blockId The ID of the block emitting this fragment
   * @param sourceId The source statement ID
   * @param fragment The fragment to collect
   */
  collectFragment(blockId: string, sourceId: number, fragment: ICodeFragment): void;
  
  /**
   * Get all collected fragments (flat array).
   * 
   * @returns Array of all collected fragments
   */
  getAllFragments(): ICodeFragment[];
  
  /**
   * Get fragments grouped by block.
   * 
   * @returns Map of blockId to fragments array
   */
  getFragmentsByBlock(): Map<string, ICodeFragment[]>;
  
  /**
   * Get fragments filtered by behavior type.
   * 
   * @param behavior The behavior to filter by
   * @returns Array of fragments with the specified behavior
   */
  getFragmentsByBehavior(behavior: MetricBehavior): ICodeFragment[];
  
  /**
   * Get fragments filtered by multiple behavior types.
   * 
   * @param behaviors Array of behaviors to include
   * @returns Array of fragments matching any of the specified behaviors
   */
  getFragmentsByBehaviors(behaviors: MetricBehavior[]): ICodeFragment[];
  
  /**
   * Clear all collected fragments.
   * Used to reset state between workouts.
   */
  clear(): void;
}

/**
 * Default implementation of fragment-based metric collection.
 * 
 * Stores fragments in memory during workout execution for later analysis.
 * Organizes fragments by block ID and provides efficient querying by behavior.
 */
export class FragmentMetricCollector implements IFragmentMetricCollector {
  private fragmentsByBlock: Map<string, ICodeFragment[]> = new Map();
  
  collectFragment(blockId: string, sourceId: number, fragment: ICodeFragment): void {
    // Get or create fragment array for this block
    const fragments = this.fragmentsByBlock.get(blockId) || [];
    
    // Add the fragment
    fragments.push(fragment);
    
    // Update the map
    this.fragmentsByBlock.set(blockId, fragments);
  }
  
  getAllFragments(): ICodeFragment[] {
    const allFragments: ICodeFragment[] = [];
    
    // Flatten all fragment arrays
    for (const fragments of this.fragmentsByBlock.values()) {
      allFragments.push(...fragments);
    }
    
    return allFragments;
  }
  
  getFragmentsByBlock(): Map<string, ICodeFragment[]> {
    // Return a copy to prevent external modification
    return new Map(this.fragmentsByBlock);
  }
  
  getFragmentsByBehavior(behavior: MetricBehavior): ICodeFragment[] {
    const allFragments = this.getAllFragments();
    return allFragments.filter(f => f.behavior === behavior);
  }
  
  getFragmentsByBehaviors(behaviors: MetricBehavior[]): ICodeFragment[] {
    const allFragments = this.getAllFragments();
    return allFragments.filter(f => f.behavior && behaviors.includes(f.behavior));
  }
  
  clear(): void {
    this.fragmentsByBlock.clear();
  }
}
