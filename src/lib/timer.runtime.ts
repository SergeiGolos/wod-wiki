import { RuntimeBlock } from "./RuntimeBlock";
export type TimerEventType = 'complete' | 'stop' | 'start' | 'lap';
export type TimerEvent = {
  index: number;  
  blockId: number;  
  timestamp: Date;
  type: TimerEventType;
}

export class TimerRuntime {
  public round: number = 0;
  public current:  [RuntimeBlock | undefined, number]  = [undefined, -1];  
  public events: TimerEvent[] = [];

  constructor(public blocks: RuntimeBlock[]) {
    // Create lookup map for blocks by ID
    blocks.forEach((block, index) => {
      this[block.id] = [ block, index ] ;
    });
  }

  // Allow accessing blocks by ID
  [key: number]: [RuntimeBlock | undefined, number] | undefined;    
  push(type: TimerEventType): TimerEvent[] {
    if (this.current && this.current[0]) {      
      this.events.push({ index: this.round, blockId : this.current![0]!.id, timestamp: new Date(), type });
    }
    return this.events;
  }

  resest(): [RuntimeBlock | undefined, number] { 
    this.events = [];
    return this.goTo(-1);
  }
  
  complete(): [RuntimeBlock | undefined, number] {    
    while (this.goToNext()[1] != -1) {
      this.push('start');
      this.push('complete');    
    }
    return this.current;
  }

  get(index: number): [RuntimeBlock | undefined, number] {    
    if (!this.blocks || this.blocks.length === 0 || index >= this.blocks.length) {
      return [undefined, -1];
    } 
    return [this.blocks[index], index];    
  }

  goTo(index: number): [RuntimeBlock | undefined, number] {        
    this.current = this.get(index);
    console.log('Go to:', index, this.current);
    return this.current;
  }
  
  goToNext(): [RuntimeBlock | undefined, number] {    
    let index = -1;    
    let startIndex = this.current[1] + 1;
    for (let i = startIndex; i < this.blocks.length; i++) {      
        index = i;      
        break;
    }    
    this.round += 1;
    return this.goTo(index);
  }
}
