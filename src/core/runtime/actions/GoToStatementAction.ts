import { IRuntimeAction, ITimerRuntime, IRuntimeEvent, StatementNode, IRuntimeBlock } from "@/core/timer.types";



export class GoToStatementAction implements IRuntimeAction {
  constructor(public blockId: number) { }

  apply(runtime: ITimerRuntime): IRuntimeEvent[] {
    const blocks = runtime.script.nodes;
    const block = blocks.find(block => block.id === this.blockId);

    if (block) {
      runtime.goto(block);
    } 
    return [];
  }
  
  // gotoBlock(node: StatementNode | undefined): IRuntimeBlock {                
  //   const report = this.current?.report() ?? [];
  //   this.results = [...this.results, ...report];      
    
  //   if (node == undefined) {
  //     this.onSetCursor(undefined);
  //     return this.current = new IdleRuntimeBlock();
  //   }    
  //   console.log("Navigating to block:", node.id, node.isLeaf, node.children.length);  
  //   if (node.isLeaf === true || node.children.length == 0) {
  //     const leaf = this.script.goto(node.id);
  //     const compiledBlock = this.jit.compile(this.trace!, leaf);            
  //     this.onSetCursor(compiledBlock);
  //     return this.current = compiledBlock;
  //   }

  //   // Get the initial execution stack for this node
  //   let current = this.script.getId(node.id);        
  //   let expectedRounds = (current?.rounds ?? 1);
  //   if (current?.children?.length ?? 0 > 0) {
  //     expectedRounds *= current?.children?.length ?? 1;
  //   }
    
  //   let reentryCount = this.trace!.get(current?.id ?? -1) ?? 0;
  //   while (current && reentryCount >= expectedRounds) {      
  //     current = this.script.getId(current.parent ?? current.next ?? -1);
  //     reentryCount = this.trace!.get(current?.id ?? -1) ?? 0;
  //   }
    
  //   while (current && current.children?.length > 0) {
  //     reentryCount = this.trace!.get(current.id) ?? 0;
      
  //     // Select child using round-robin (modulo number of children)
  //     const childIndex = reentryCount % current.children.length;
  //     const childId = current.children[childIndex];
      
  //     // Update the stack to include the selected child
  //     current = this.script.getId(childId) ?? undefined;
  //   }

  //   if (!current) {
  //     // Prevent overwriting DoneRuntimeBlock with IdleRuntimeBlock
  //     if (this.current && this.current.type === 'done') {
  //       this.onSetCursor(undefined);
  //       return this.current;
  //     }
  //     this.onSetCursor(undefined);
  //     return this.current = new IdleRuntimeBlock();
  //   }

  //   var stack = this.script.goto(current.id);
  //   if (!stack) {
  //     const errorId = current?.id ?? -1;
  //     console.error('[gotoBlock] Failed to find block:', errorId);
  //     throw new Error(`Block with ID ${errorId} not found`);
  //   }
  
  //   const compiledBlock = this.jit.compile(this.trace!, stack);
  //   this.onSetCursor(compiledBlock);
  //   return this.current = compiledBlock;
  // }
}
