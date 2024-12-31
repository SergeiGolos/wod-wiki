export class TimerFromSeconds {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;

  constructor(miliseconds: number) {    
    const multiplier = 10 ** 3;
    let remaining = miliseconds;

    this.days = Math.floor(remaining / 86400); 
    remaining %= 86400;

    this.hours = Math.floor(remaining / 3600);   
    remaining %= 3600;

    this.minutes = Math.floor(remaining / 60);    
    remaining %= 60;

    this.seconds = Math.floor(remaining);
    
    this.milliseconds = Math.round((remaining - this.seconds) * multiplier);
  }

  toClock(): [string, string] {
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const days = this.days || 0;
    const hours = this.hours || 0;
    const minutes = this.minutes || 0;
    const seconds = this.seconds || 0;
    const milliseconds = this.milliseconds || 0;
    
    const clock = [];
    if (days && days > 0) {
      clock.push(`${days}`);
    }

    if (clock.length > 0 || hours && hours > 0) {
      clock.push(`${pad(hours)}`);
    }

    if (clock.length > 0 || minutes && minutes > 0) {
      clock.push(`${pad(minutes)}`);
    }

    clock.push(`${pad(seconds)}`);
    
    return [clock.join(':'), milliseconds.toString()];  
  }
}
