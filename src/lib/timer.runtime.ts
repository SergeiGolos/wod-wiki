import { RuntimeBlock } from "./RuntimeBlock";
export type TimerEventType = 'complete' | 'stop' | 'start' | 'lap';
export type TimerEvent = {
  index: number;  
  blockId: number;  
  timestamp: Date;
  type: TimerEventType;
}

export class TimerRuntime {
  public round: number = -1;
  public current:  [RuntimeBlock | undefined, number]  = [undefined, -1];
  private blockMap: { [key: number]: [RuntimeBlock, number] } = {};
  events: TimerEvent[] = [];
    
  constructor(public blocks: RuntimeBlock[]) {
    // Create lookup map for blocks by ID
    blocks.forEach((block, index) => {
      this.blockMap[block.id] = [ block, index ] ;
    });
  }

  // Allow accessing blocks by ID
  [key: number]: [RuntimeBlock | undefined, number] | undefined;
  get(id: number): [RuntimeBlock | undefined, number] | undefined {
    return this?.blockMap[id];
  }
  /**
   * Resets all block timestamps
   */
    
  push(type: TimerEventType): TimerEvent[] {
    this.events.push({ index: this.round, blockId : this.current![0]!.id, timestamp: new Date(), type });
    return this.events;
  }
  resest(): [RuntimeBlock | undefined, number] { 
    this.events = [];
    return this.current;
  }
  complete(): [RuntimeBlock | undefined, number] {
    this.current = [undefined, -1];
    return this.current;
  }

  goTo(index: number): [RuntimeBlock | undefined, number] {
    console.log('Go to:', index, this.blocks);
    if (!this.blocks || this.blocks.length === 0 || index >= this.blocks.length) {
      this.current = [undefined, -1];
    }  else {
      this.current= [this.blocks[index], index];    
    }
    return this.current;
  }
 
  goToNext() {    
    this.current = this.goTo(this.findNextRunnableBlock(this.current[1] + 1));
    return this.current;
  }
  /**
   * Finds the next runnable block starting from the given index
   */
  private findNextRunnableBlock(startIndex: number): number {            
    for (let i = startIndex; i < this.blocks.length; i++) {      
        return i;      
    }
    return -1;
  }
  
  /**
   * Handles timer events and manages block state transitions
   */
 
}
