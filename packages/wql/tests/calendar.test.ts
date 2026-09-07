import { describe, expect, it } from 'vitest';
import {
  captureContext,
  civilDateAdd,
  civilDateOf,
  civilMonday,
  resolveWindowRange,
  zonedStartOfDay,
  type ExecutionContext,
} from '../src/calendar';

const NY = 'America/New_York';
const TOKYO = 'Asia/Tokyo';

/** Mar 9 2026 noon EST (post-DST-jump, EDT) in New York. */
const MAR9_NOON_NY = Date.UTC(2026, 2, 9, 16, 0, 0); // 12:00 EST-4 = 16:00Z
/** Wed Sep 9 2026 noon in New York (EDT, UTC-4). */
const SEP9_NOON_NY = Date.UTC(2026, 8, 9, 16, 0, 0);
/** Jan 1 2027 noon in New York (EST, UTC-5). */
const JAN1_NOON_NY = Date.UTC(2027, 0, 1, 17, 0, 0);

const ctx = (instant: number, timeZone = NY): ExecutionContext => captureContext(instant, timeZone);

describe('civil date primitives', () => {
  it('maps an instant to its civil date in the given timezone (contract example 5)', () => {
    // 2026-09-05 00:30 UTC is Sep 4 in New York and Sep 5 in Tokyo.
    const instant = Date.UTC(2026, 8, 5, 0, 30);
    expect(civilDateOf(instant, NY)).toBe('2026-09-04');
    expect(civilDateOf(instant, TOKYO)).toBe('2026-09-05');
  });

  it('adds civil days across month and year boundaries', () => {
    expect(civilDateAdd('2026-09-30', 1)).toBe('2026-10-01');
    expect(civilDateAdd('2026-12-31', 1)).toBe('2027-01-01');
    expect(civilDateAdd('2028-02-28', 1)).toBe('2028-02-29'); // leap
    expect(civilDateAdd('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('finds the Monday of a civil week', () => {
    expect(civilMonday('2026-09-09')).toBe('2026-09-07'); // Wednesday
    expect(civilMonday('2026-09-07')).toBe('2026-09-07'); // Monday itself
    expect(civilMonday('2026-09-06')).toBe('2026-08-31'); // Sunday → prior Monday
  });

  it('computes local midnight in the given timezone', () => {
    // Mar 8 2026 local midnight New York (EST, UTC-5, before the jump).
    expect(zonedStartOfDay('2026-03-08', NY)).toBe(Date.UTC(2026, 2, 8, 5));
    // Sep 9 2026 local midnight New York (EDT, UTC-4).
    expect(zonedStartOfDay('2026-09-09', NY)).toBe(Date.UTC(2026, 2 + 6, 9, 4));
  });
});

describe('relative day windows (contract examples 1–2)', () => {
  it('last 7d at Mar 9 2026 noon NY begins Mar 3 local midnight — seven civil dates, not 168 hours', () => {
    const range = resolveWindowRange({ kind: 'relative', size: 7, unit: 'd' }, ctx(MAR9_NOON_NY))!;
    expect(range.start).toBe(zonedStartOfDay('2026-03-03', NY));
    // DST: Mar 3→Mar 9 spans the 23-hour day, so the elapsed span is NOT 7×24h.
    expect(range.end - range.start).not.toBe(7 * 86_400_000);
    expect(range.end).toBe(MAR9_NOON_NY + 1); // inclusive captured instant (exclusive bound)
    expect(range.endExclusive).toBe(true);
  });

  it('last Nd includes N local dates ending today, per calendar arithmetic', () => {
    const range = resolveWindowRange({ kind: 'relative', size: 1, unit: 'd' }, ctx(MAR9_NOON_NY))!;
    expect(range.start).toBe(zonedStartOfDay('2026-03-09', NY));
  });

  it('relative windows never extend into the future', () => {
    const range = resolveWindowRange({ kind: 'relative', size: 30, unit: 'd' }, ctx(MAR9_NOON_NY))!;
    expect(range.end).toBe(MAR9_NOON_NY + 1);
  });
});

describe('relative week windows (contract examples 3–4)', () => {
  it('last 4w at Wed Sep 9 2026 noon begins Mon Aug 17', () => {
    const range = resolveWindowRange({ kind: 'relative', size: 4, unit: 'w' }, ctx(SEP9_NOON_NY))!;
    expect(range.start).toBe(zonedStartOfDay('2026-08-17', NY));
  });

  it('last 4w at Jan 1 2027 noon begins Mon Dec 7 2026', () => {
    const range = resolveWindowRange({ kind: 'relative', size: 4, unit: 'w' }, ctx(JAN1_NOON_NY))!;
    expect(range.start).toBe(zonedStartOfDay('2026-12-07', NY));
  });

  it('current week counts as the Nth week (partial, through the captured instant)', () => {
    const range = resolveWindowRange({ kind: 'relative', size: 1, unit: 'w' }, ctx(SEP9_NOON_NY))!;
    expect(range.start).toBe(zonedStartOfDay('2026-09-07', NY));
  });
});

describe('explicit civil ranges (contract example 6)', () => {
  it('from 2026-09-05 to 2026-09-07 includes all three full local dates and excludes Sep 8 midnight', () => {
    const range = resolveWindowRange(
      { kind: 'range', start: '2026-09-05', end: '2026-09-07' },
      ctx(SEP9_NOON_NY),
    )!;
    expect(range.start).toBe(zonedStartOfDay('2026-09-05', NY));
    expect(range.end).toBe(zonedStartOfDay('2026-09-08', NY));
    expect(range.endExclusive).toBe(true);
    // Half-open: Sep 8 00:00:00.000 is out, Sep 7 23:59:59.999 is in.
    expect(range.end - 1).toBeGreaterThan(range.start);
  });

  it('keeps an explicit future range (never silently replaced)', () => {
    const range = resolveWindowRange(
      { kind: 'range', start: '2030-01-01', end: '2030-01-07' },
      ctx(SEP9_NOON_NY),
    )!;
    expect(range.start).toBe(zonedStartOfDay('2030-01-01', NY));
  });

  it('an open-ended explicit range has an unbounded side', () => {
    const range = resolveWindowRange({ kind: 'range', start: '2026-09-05' }, ctx(SEP9_NOON_NY))!;
    expect(range.end).toBe(Number.MAX_SAFE_INTEGER);
    expect(range.endExclusive).toBe(false);
  });
});

describe('half-open week membership (contract example 4)', () => {
  it('Sunday 23:55 and Monday 00:05 land in different week anchors; Monday midnight belongs only to the new week', () => {
    // Sunday Sep 6 2026 23:55 EDT and Monday Sep 7 00:05 EDT.
    const sunday2355 = Date.UTC(2026, 8, 7, 3, 55); // 23:55 EDT = 03:55Z
    const monday0005 = Date.UTC(2026, 8, 7, 4, 5);  // 00:05 EDT = 04:05Z
    const week = { kind: 'relative', size: 4, unit: 'w' } as const;

    const atSunday = resolveWindowRange(week, ctx(sunday2355))!;
    expect(civilMonday(civilDateOf(sunday2355, NY))).toBe('2026-08-31');
    expect(atSunday.start).toBe(zonedStartOfDay('2026-08-10', NY)); // current week Aug 31 + 3 preceding

    const atMonday = resolveWindowRange(week, ctx(monday0005))!;
    expect(atMonday.start).toBe(zonedStartOfDay('2026-08-17', NY)); // week of Sep 7 is current → window shifts

    // Half-open membership: a range starting exactly Monday midnight includes
    // the Monday-midnight metric but not the Sunday one.
    const boundary = zonedStartOfDay('2026-09-07', NY);
    expect(monday0005 >= boundary).toBe(true);
    expect(sunday2355 >= boundary).toBe(false);
  });
});

describe('DST days (contract example 1)', () => {
  it('a 23-hour day and a 25-hour day each form exactly one calendar bucket', () => {
    // 2026-03-08 is the 23-hour day in New York (spring forward).
    expect(zonedStartOfDay('2026-03-09', NY) - zonedStartOfDay('2026-03-08', NY)).toBe(23 * 3_600_000);
    // 2026-11-01 is the 25-hour day (fall back).
    expect(zonedStartOfDay('2026-11-02', NY) - zonedStartOfDay('2026-11-01', NY)).toBe(25 * 3_600_000);
  });
});

describe('captured execution context', () => {
  it('defaults to the system clock and system timezone', () => {
    const c = captureContext();
    expect(Math.abs(c.instant - Date.now())).toBeLessThan(5_000);
    expect(c.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('keeps the caller-supplied values (one capture per document run)', () => {
    const c = captureContext(123, TOKYO);
    expect(c.instant).toBe(123);
    expect(c.timeZone).toBe(TOKYO);
  });
});
