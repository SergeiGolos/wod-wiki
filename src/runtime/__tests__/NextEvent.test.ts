import { describe, it, expect, beforeEach } from 'bun:test';
import { NextEvent } from '../NextEvent';
import { IEvent } from '../IEvent';

describe('NextEvent', () => {
  let event: NextEvent;

  beforeEach(() => {
    event = new NextEvent();
  });

  it('should implement IEvent interface', () => {
    expect(event).toSatisfy((e: any) => 'name' in e && 'timestamp' in e);
  });

  it('should have correct event name', () => {
    expect(event.name).toBe('next');
  });

  it('should have timestamp of type Date', () => {
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('should accept optional data parameter', () => {
    const testData = { step: 1, source: 'button' };
    const eventWithData = new NextEvent(testData);
    expect(eventWithData.data).toEqual(testData);
  });

  it('should have undefined data when no parameter provided', () => {
    expect(event.data).toBeUndefined();
  });

  it('should handle null data parameter', () => {
    const eventWithNull = new NextEvent(null);
    expect(eventWithNull.data).toBeNull();
  });

  it('should handle complex data objects', () => {
    const complexData = {
      metadata: { source: 'ui', user: 'test' },
      config: { fastMode: true, skipBreaks: false },
      timestamps: { createdAt: Date.now() }
    };
    const eventWithComplex = new NextEvent(complexData);
    expect(eventWithComplex.data).toEqual(complexData);
  });

  it('should handle data mutation on original object', () => {
    const mutableData = { counter: 0 };
    const eventWithMutable = new NextEvent(mutableData);

    mutableData.counter = 1;
    expect(eventWithMutable.data?.counter).toBe(1);
  });

  it('should create unique timestamps for multiple events', () => {
    const event1 = new NextEvent();
    const event2 = new NextEvent();

    expect(event1.timestamp.getTime()).not.toBe(event2.timestamp.getTime());
  });

  it('should be serializable to JSON', () => {
    const eventData = { test: 'value' };
    const jsonEvent = new NextEvent(eventData);

    const json = JSON.stringify(jsonEvent);
    const parsed = JSON.parse(json);

    expect(parsed.name).toBe('next');
    expect(parsed.data).toEqual(eventData);
    expect(new Date(parsed.timestamp)).toBeInstanceOf(Date);
  });
});
