import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventHandler } from "../EventHandler";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { JitStatement } from "@/core/JitStatement";
import { LapFragment } from "@/core/fragments/LapFragment";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { BlockKey } from "@/core/BlockKey";

/**
 * Legacy base class for runtime blocks, now extends AbstractBlockLifecycle
 * to leverage the template method pattern while maintaining backward compatibility
 */
export abstract class RuntimeBlock implements IRuntimeBlock {  
  constructor(public sources: JitStatement[]) {    
    this.blockId = Math.random().toString(36).substring(2, 15);
    this.blockKey = new BlockKey();
    this.blockKey.push(this.sources, 0);
  }
  public blockId: string;
  public blockKey: BlockKey;
  public parent?: IRuntimeBlock | undefined;
  
  public spans: RuntimeSpan[] = [];
  public handlers: EventHandler[] = [];
  
  public selectMany<T>(fn: (node: JitStatement) => T[]): T[] {
    let results: T[] = [];
    for (const source of this.sources) {
      results = results.concat(fn(source));
    }
    return results;
  }

  // Renamed original abstract methods to be protected hooks
  protected abstract onEnter(runtime: ITimerRuntime): IRuntimeAction[];
  protected abstract onLeave(runtime: ITimerRuntime): IRuntimeAction[];
  protected abstract onNext(runtime: ITimerRuntime): IRuntimeAction[];

  // New public wrapper methods providing space for common logic
  public enter(runtime: ITimerRuntime): IRuntimeAction[] {
    // Space for common code to run before the specific block's onEnter logic
    
    const actions = this.onEnter(runtime);
    // Space for common code to run after the specific block's onEnter logic
    return actions;
  }

  public leave(runtime: ITimerRuntime): IRuntimeAction[] {
    // Space for common code to run before the specific block's onLeave logic
    this.blockKey = BlockKey.create(this);
    const actions = this.onLeave(runtime);
    // Space for common code to run after the specific block's onLeave logic
    return actions;
  }

  public next(runtime: ITimerRuntime): IRuntimeAction[] {
    // Space for common code to run before the specific block's onNext logic
    this.blockKey.index += 1;
    const actions = this.onNext(runtime);
    // Space for common code to run after the specific block's onNext logic
    return actions;
  }

  public handle(
    runtime: ITimerRuntime,
    event: IRuntimeEvent,
    system: EventHandler[]
  ): IRuntimeAction[] {
    const result: IRuntimeAction[] = [];
    for (const handler of [...system, ...this.handlers]) {
      const actions = handler.apply(event, runtime);
      for (const action of actions) {
        result.push(action);
      }
    }

    return result;
  }

  /**
   * Retrieves a sequence of consecutive child JitStatements that are part of a 'compose' group.
   * Iteration starts from the given startIndex and continues as long as subsequent statements
   * have a LapFragment with group type 'compose'.
   * 
   * @param startIndex The index in `this.sources` to start looking for the compose group.
   * @returns An array of JitStatement objects belonging to the consecutive compose group.
   */
  public getChildStatements(startIndex: number): JitStatement[] {
    const groupStatements: JitStatement[] = [];

    if (startIndex < 0 || startIndex >= this.sources.length) {
      // Return empty if startIndex is out of bounds
      return groupStatements;
    }

    for (let i = startIndex; i < this.sources.length; i++) {
      const currentStatement = this.sources[i];
      let isComposeStatement = false;

      // Check if the statement has a LapFragment with groupType 'compose'
      if (currentStatement.fragments) {
        for (const fragment of currentStatement.fragments) {
          if (fragment.type === 'lap') {
            // We assume fragment is LapFragment based on type; cast for property access
            const lapFragment = fragment as LapFragment;
            if (lapFragment.group === 'compose') {
              isComposeStatement = true;
              break; // Found a compose LapFragment, no need to check others
            }
          }
        }
      }

      if (isComposeStatement) {
        groupStatements.push(currentStatement);
      } else {
        // Stop if the current statement is not part of the compose group
        break;
      }
    }
    return groupStatements;
  }
}
