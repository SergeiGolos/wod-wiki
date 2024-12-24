import type { IToken } from "chevrotain";

/*
 
 

 

*/

export type MdTimerStack = {  
  
  blocks: MdTimerBlock[];  
}

export type MdTimerTrace = {
  events: MdTimerBlockEvent[];
}

export type MdTimerBlockEvent = {
  eventId: number;
  timestamp: Date;
  type: string;
  metadata : any;
}

export type MdTimerOptional = {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

export type MdTimerValue = {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds? : number;
};

export class MdTimerFromSeconds implements MdTimerValue {
  constructor(miliseconds: number) {    
    const multiplier = 10 ** 3;
    let remaining = miliseconds;

    this.days = Math.floor(remaining  / 86400); 
    remaining  %= 86400;

    this.hours = Math.floor(remaining  / 3600);   
    remaining %= 3600;

    this.minutes = Math.floor(remaining / 60);    
    remaining %= 60;

    this.seconds = Math.floor(remaining)
    
    this.milliseconds = Math.round((remaining - this.seconds) * multiplier);
  }

  days?: number | undefined;
  hours?: number | undefined;
  minutes?: number | undefined;
  seconds?: number | undefined;
  milliseconds?: number | undefined;

  toClock(): [string, string] { 
    const result = [];
    if (this.days != null && this.days != 0) {
      result.push(this.days.toString())
    }
    if (this.hours != null && this.hours != 0) {
      result.push(this.hours.toString())
    }
    if (this.minutes != null && this.minutes != 0) {
      result.push(this.minutes.toString())
    }    
    let sec = this.seconds?.toString() || "0";
    if (sec.length == 1) {
      sec = "0" + sec;
    }
    
    result.push(sec);
    
    let mill = this.milliseconds?.toString() || "0";
    while (mill.length < 3) {
      mill = mill + "0";
    }             
    return [result.join(":"),  mill];
  }
}

export type MdTimerBlock = {
  duration?: number;  
  effort?: string;
  resistance?: any;  
  repeater?: any;
};

export type TimerInstance = {
  direction: string;
  timer: number;
};
