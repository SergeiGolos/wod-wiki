import { IRuntimeBlock, ITimerRuntime, PrecompiledNode, IRuntimeEvent } from "../../../timer.types";
import { TimerBlock } from "../TimerBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating SingleBlock runtime blocks
 * Handles simple statements with duration and metrics but no children or repetitions
 */
export class BlockTimerStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: PrecompiledNode[]): boolean {
    // Only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }
    
    const node = nodes[0];
    const rounds = node.rounds();
    const duration = node.duration();
    const hasDuration = duration.original !== undefined;
    const hasNoEffort = node.effort().length === 0;
    const hasNoRepetitions = node.repetitions().length === 0;
    
    // Handle timer nodes with duration and no other fragments or children
    return rounds.length === 0 && 
           hasDuration && 
           hasNoEffort && 
           hasNoRepetitions && 
           node.children.length === 0;
  }

  compile(
    nodes: PrecompiledNode[], 
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {    
    // Only handle the array if it contains exactly one node
    if (nodes.length !== 1) {
      console.warn('TimerBlockStrategy: Expected array with exactly one node');
      return undefined;
    }
    
    const node = nodes[0];
    const duration = node.duration();
    
    // Create a new TimerBlock with the node's duration
    const timerBlock = new TimerBlock(nodes);
    const context = timerBlock.getContext();
    
    // Set up the duration for the timer block
    if (duration.original !== undefined) {
      // Store the duration in the context for later use
      context.duration = duration.original;
      
      // Create an initial time span for the timer
      const startEvent: IRuntimeEvent = {
        timestamp: new Date(),
        name: 'timer_start',
        blockKey: context.blockKey
      };
      
      // Add the initial time span to the context
      context.addSpan(startEvent);
      
      // Log the timer creation
      console.log(`Created timer block with duration: ${duration.original}ms`);
    }
    
    return timerBlock;
  }
}
