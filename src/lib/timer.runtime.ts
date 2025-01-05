import { RuntimeBlock } from "./RuntimeBlock";


export class TimerRuntime {
  private current:  [RuntimeBlock | undefined, number]  = [undefined, -1];
  private blockMap: { [key: number]: [RuntimeBlock, number] } = {};

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

  start(): [RuntimeBlock | undefined, number] {
    this.current = this.getNextBlock();
    return this.current;
  };
  /**
   * Resets all block timestamps
   */
  reset(): void {
    for (const block of this.blocks) {
      block.timestamps = [];
    }
    this.current = [undefined, -1];
  }  

  getNextBlock(): [RuntimeBlock | undefined, number] {
    if (!this.blocks || this.blocks.length === 0) {
      return [undefined, -1];
    }

    const nextIndex = this.findNextRunnableBlock(this.current[1] + 1);
    /// 
    return nextIndex === -1 ? [undefined, -1] : [this.blocks[nextIndex], nextIndex];
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
  handleTimerEvent(event: 'completed' | 'stop' | 'started' | 'lap'): [ RuntimeBlock | undefined, number ] {
    const now = new Date();
    
    switch (event) {
      case 'completed':
        this.handleBlockCompletion(now);
        break;
      case 'stop':
        this.handleBlockStop(now);
        break;
      case 'started':
        this.handleBlockStart(now);
        break;
      case 'lap':
        this.handleLap(now);
        break;
    }

    return this.current;
  }

  private handleBlockCompletion(timestamp: Date): void {    
    if (this.current[0] && this.current[1] !== -1) {      
      this.current[0].timestamps.push({ type: 'stop', time: timestamp });
    }
    
    this.current = this.getNextBlock();
    if (this.current[0] && this.current[1] !== -1) {
      this.current[0].timestamps.push({ type: 'start', time: timestamp });      
    }  
  }


  private handleBlockStop(timestamp: Date): void {
    if (this.current[0] && this.current[1] !== -1) {
      this.current[0].timestamps.push({ type: 'stop', time: timestamp });
    }
  }

  private handleBlockStart(timestamp: Date): void {
    if (this.current[0] && this.current[1] !== -1) {            
      if (!this.current[0].timestamps) {
        this.current[0].timestamps = [];
      }
      
      this.current[0].timestamps.push({ type: 'start', time: timestamp });
    }
  }

  private handleLap(timestamp: Date): void {
    if (this.current[0] && this.current[1] !== -1) {
      this.current[0].timestamps.push({ type: 'lap', time: timestamp });
      this.current[0].lap += 1;          
      // if (this.current[0].round <=  this.current[0].laps) {
      //   this.handleBlockCompletion(timestamp);
      // }
    }
  }
}
