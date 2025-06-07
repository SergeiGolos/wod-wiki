import { describe, it, expect } from 'vitest';
import { SetDurationAction } from './SetDurationAction';
import { ITimerRuntime } from '@/core/ITimerRuntime';
import { Subject } from 'rxjs';
import { IRuntimeEvent } from '@/core/IRuntimeEvent';

describe('SetDurationAction', () => {
  const mockRuntime = {} as ITimerRuntime;
  const mockInput = new Subject<IRuntimeEvent>();

  it('should create with correct duration and timer name', () => {
    const duration = 30000; // 30 seconds
    const timerName = "primary";
    
    const action = new SetDurationAction(duration, timerName);
    
    expect(action.duration).toBe(duration);
    expect(action.timerName).toBe(timerName);
    expect(action.eventType).toBe('SET_DURATION');
  });

  it('should return correct data from getData', () => {
    const duration = 60000; // 60 seconds
    const timerName = "secondary";
    
    const action = new SetDurationAction(duration, timerName);
    const data = action.getData();
    
    expect(data).toEqual({
      timerName: timerName,
      duration: duration
    });
  });

  it('should create correct output event from write', () => {
    const duration = 45000; // 45 seconds
    const timerName = "primary";
    
    const action = new SetDurationAction(duration, timerName);
    const events = action.write(mockRuntime, mockInput);
    
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      eventType: 'SET_DURATION',
      bag: {
        timerName: timerName,
        duration: duration
      },
      timestamp: expect.any(Date)
    });
  });

  it('should handle different timer names', () => {
    const testCases = [
      { duration: 30000, timerName: "primary" },
      { duration: 60000, timerName: "secondary" },
      { duration: 120000, timerName: "rest" },
    ];

    testCases.forEach(({ duration, timerName }) => {
      const action = new SetDurationAction(duration, timerName);
      const events = action.write(mockRuntime, mockInput);
      
      expect(events[0].bag.timerName).toBe(timerName);
      expect(events[0].bag.duration).toBe(duration);
    });
  });

  it('should handle zero duration', () => {
    const action = new SetDurationAction(0, "test");
    const events = action.write(mockRuntime, mockInput);
    
    expect(events[0].bag.duration).toBe(0);
  });
});