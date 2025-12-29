import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { ActionPhase, PHASE_EXECUTION_ORDER, getActionPhase } from './ActionPhase';

/**
 * Configuration for the phased action processor
 */
export interface PhasedProcessorConfig {
  /** Enable debug logging */
  debug?: boolean;
  
  /** Maximum iterations to prevent infinite loops */
  maxIterations?: number;
}

const DEFAULT_CONFIG: Required<PhasedProcessorConfig> = {
  debug: false,
  maxIterations: 100
};

/**
 * PhasedActionProcessor separates action execution into distinct phases.
 * 
 * This prevents cyclical dependencies where:
 * - Events emitted during pop trigger new pushes mid-lifecycle
 * - Multiple behaviors try to pop the same block
 * - Stack mutations interleave with event processing
 * 
 * The processor collects all actions, sorts them by phase, and executes
 * each phase completely before moving to the next.
 * 
 * Phase order:
 * 1. DISPLAY - Quick UI feedback
 * 2. MEMORY - State changes
 * 3. SIDE_EFFECT - Sounds, logging
 * 4. EVENT - Event dispatch (may queue more actions for next cycle)
 * 5. STACK - Push/pop (isolated at end)
 * 
 * IMMEDIATE phase actions are executed inline when queued, bypassing phase sorting.
 */
export class PhasedActionProcessor {
  private readonly pendingByPhase: Map<ActionPhase, IRuntimeAction[]> = new Map();
  private readonly config: Required<PhasedProcessorConfig>;
  
  private isProcessing = false;
  private currentPhase: ActionPhase | null = null;
  private iterationCount = 0;

  constructor(config: PhasedProcessorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize phase buckets
    for (const phase of PHASE_EXECUTION_ORDER) {
      this.pendingByPhase.set(phase, []);
    }
  }

  /**
   * Queue an action for phased execution.
   * IMMEDIATE phase actions are returned for immediate execution.
   * Other phases are collected and processed in order.
   */
  queue(action: IRuntimeAction): IRuntimeAction | null {
    const phase = getActionPhase(action);
    
    if (this.config.debug) {
      console.log(`[PAP] queue: ${action.type} -> ${phase}`);
    }
    
    // IMMEDIATE actions bypass phase sorting
    if (phase === ActionPhase.IMMEDIATE) {
      return action;
    }
    
    const bucket = this.pendingByPhase.get(phase);
    if (bucket) {
      bucket.push(action);
    } else {
      // Fallback: treat unknown phases as immediate
      // This can happen if a new phase is added but PHASE_EXECUTION_ORDER isn't updated
      if (this.config.debug) {
        console.warn(`[PAP] Unknown phase '${phase}' for action ${action.type}, treating as immediate`);
      }
      return action;
    }
    
    return null;
  }

  /**
   * Queue multiple actions, returning any that should be executed immediately.
   */
  queueMany(actions: IRuntimeAction[]): IRuntimeAction[] {
    const immediateActions: IRuntimeAction[] = [];
    
    for (const action of actions) {
      const immediate = this.queue(action);
      if (immediate) {
        immediateActions.push(immediate);
      }
    }
    
    return immediateActions;
  }

  /**
   * Check if there are pending actions in any phase.
   */
  hasPendingActions(): boolean {
    for (const [, actions] of this.pendingByPhase) {
      if (actions.length > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get count of pending actions by phase.
   */
  getPendingCounts(): Map<ActionPhase, number> {
    const counts = new Map<ActionPhase, number>();
    for (const [phase, actions] of this.pendingByPhase) {
      counts.set(phase, actions.length);
    }
    return counts;
  }

  /**
   * Process all pending actions in phase order.
   * 
   * Phases are processed completely before moving to the next.
   * If processing events or stack mutations produces new actions,
   * those are queued for the next processing cycle.
   * 
   * @returns true if any actions were processed
   */
  processAllPhases(runtime: IScriptRuntime): boolean {
    if (this.isProcessing) {
      if (this.config.debug) {
        console.log(`[PAP] processAllPhases: already processing, skipping`);
      }
      return false;
    }
    
    if (!this.hasPendingActions()) {
      return false;
    }
    
    this.isProcessing = true;
    this.iterationCount = 0;
    
    try {
      let processedAny = false;
      
      // Process phases in order, allowing new actions to be queued
      // Continue until no more pending actions or max iterations reached
      while (this.hasPendingActions() && this.iterationCount < this.config.maxIterations) {
        this.iterationCount++;
        
        if (this.config.debug) {
          console.log(`[PAP] iteration ${this.iterationCount}, pending: ${this.formatPending()}`);
        }
        
        // Process each phase in order
        for (const phase of PHASE_EXECUTION_ORDER) {
          const processed = this.processPhase(phase, runtime);
          if (processed) {
            processedAny = true;
          }
        }
      }
      
      if (this.iterationCount >= this.config.maxIterations) {
        console.error(`[PAP] Max iterations (${this.config.maxIterations}) reached, possible infinite loop`);
      }
      
      return processedAny;
    } finally {
      this.isProcessing = false;
      this.currentPhase = null;
    }
  }

  /**
   * Process a single phase, executing all pending actions for that phase.
   */
  private processPhase(phase: ActionPhase, runtime: IScriptRuntime): boolean {
    const actions = this.pendingByPhase.get(phase);
    if (!actions || actions.length === 0) {
      return false;
    }
    
    // Take all pending actions for this phase
    const toProcess = [...actions];
    actions.length = 0; // Clear the bucket
    
    this.currentPhase = phase;
    
    if (this.config.debug) {
      console.log(`[PAP] processPhase: ${phase} (${toProcess.length} actions)`);
    }
    
    for (const action of toProcess) {
      try {
        if (this.config.debug) {
          console.log(`[PAP] executing: ${action.type}`);
        }
        action.do(runtime);
      } catch (error) {
        console.error(`[PAP] Error executing ${action.type}:`, error);
        // Continue processing other actions
      }
    }
    
    this.currentPhase = null;
    return true;
  }

  /**
   * Get the currently executing phase, or null if not processing.
   */
  getCurrentPhase(): ActionPhase | null {
    return this.currentPhase;
  }

  /**
   * Check if currently processing a specific phase.
   */
  isInPhase(phase: ActionPhase): boolean {
    return this.currentPhase === phase;
  }

  /**
   * Clear all pending actions (used for cleanup/reset).
   */
  clear(): void {
    for (const [, actions] of this.pendingByPhase) {
      actions.length = 0;
    }
  }

  /**
   * Format pending action counts for debug logging.
   */
  private formatPending(): string {
    const parts: string[] = [];
    for (const phase of PHASE_EXECUTION_ORDER) {
      const count = this.pendingByPhase.get(phase)?.length ?? 0;
      if (count > 0) {
        parts.push(`${phase}:${count}`);
      }
    }
    return parts.length > 0 ? parts.join(', ') : 'none';
  }
}
