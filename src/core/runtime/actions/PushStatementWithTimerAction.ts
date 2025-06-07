import { IRuntimeAction } from "@/core/IRuntimeAction";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";
import { Duration } from "@/core/Duration";

/**
 * Enhanced PushStatementAction that can inherit timer context from parent block
 * Used when a parent block with timer duration needs to pass that timing to its children
 */
export class PushStatementWithTimerAction implements IRuntimeAction {
  constructor(
    public statements: JitStatement[], 
    public inheritedDuration?: Duration,
    public timerName: string = "primary"
  ) { }
  
  name: string = "goto-with-timer";
  
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {        
    // If we have inherited duration, temporarily modify the statements to include it
    if (this.inheritedDuration && this.inheritedDuration.original) {
      // Clone the statements and add timer context
      const enhancedStatements = this.statements.map(stmt => {
        // Create a modified statement that includes the parent's timer context
        return this.enhanceStatementWithTimer(stmt, this.inheritedDuration!);
      });
      
      var block = runtime.jit.compile(enhancedStatements, runtime);
    } else {
      // No timer inheritance - use normal compilation
      var block = runtime.jit.compile(this.statements, runtime);
    }
    
    runtime.push(block);
  }
  
  /**
   * Enhance a statement with inherited timer context
   * This creates a new statement that has the parent's duration as additional context
   */
  private enhanceStatementWithTimer(statement: JitStatement, duration: Duration): JitStatement {
    // For now, we'll create a wrapper that includes timer context
    // In a full implementation, this might involve modifying the statement's duration method
    // or adding a timer context property
    
    // Simple approach: if the statement doesn't have its own duration, 
    // give it the inherited one
    const originalDurations = statement.durations();
    if (originalDurations.length === 0) {
      // Statement has no duration - inherit from parent
      const enhancedStatement = Object.create(statement);
      enhancedStatement.durations = () => [duration];
      enhancedStatement.duration = () => duration;
      enhancedStatement._inheritedTimer = true;
      return enhancedStatement;
    }
    
    // Statement already has duration - don't override
    return statement;
  }
}
