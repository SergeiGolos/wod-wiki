# Journal Zip-Load Implementation Plan v2

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Extend the existing `/load?zip=` mechanism to support creating journal entries (not just playground pages), with two date modes: "today" and a specific date, including backdate prompting for past dates.

**Architecture:** Reuse the existing zip encode/decode pipeline. Use route-level mode segmentation: `/load` for playground (existing), `/load/journal?zip=...` for today's journal entry, `/load/journal/:date?zip=...` for a specific date. The processor reads the route pathname to determine target. Journal mode parses the date from the URL path, validates it, creates/updates the journal entry in IndexedDB, and redirects to `/journal/:dateKey`. Past dates trigger a confirmation interstitial before write.

**Tech Stack:** TypeScript, React, React Router, nuqs, IndexedDB (idb), Bun Test

---

## Audit: What Exists Today

| Component | Responsibility | Relevance |
|-----------|---------------|-----------|
| `encodeZip` / `decodeZip` | gzip+base64 URL-safe codec | Reused as-is |
| `useZipProcessor` | Reads `?zip=` or `?z=`, decodes, saves to `playgroundDB`, redirects to `/playground/:id` | **Modified** — branch on route pathname |
| `LoadZipPage` | Renders loading state while `useZipProcessor` runs; also renders backdate modal for journal | **Modified** — render modal |
| `playgroundDB` / `PlaygroundDBService` | IndexedDB CRUD for pages | Reused as-is (journal entries already stored as `category: 'journal'`) |
| `journalWorkout.ts` / `appendWorkoutToJournal` | Appends workout sections to journal entries | Reused for content structure |
| `routes.tsx` | Route patterns and path builders | **Modified** — add `loadJournalPath` builder |
| `App.tsx` | Route table | **Modified** — add `/load/journal` and `/load/journal/:date` routes |

**Key convention:** Journal entries are already stored in `playgroundDB` with `category: 'journal'` and `name: 'YYYY-MM-DD'`. The page ID is `journal/YYYY-MM-DD`.

---

## Phase Dependency Chain

| Phase | Task Range | Depends On | Status |
|-------|-----------|------------|--------|
| 1. Route & URL Builders | 1–3 | — | backlog |
| 2. Date Parsing & Validation | 4–6 | — | backlog |
| 3. Journal Zip Processor | 7–10 | Phase 1, 2 | backlog |
| 4. Backdate Interstitial | 11–13 | Phase 3 | backlog |
| 5. Integration & Redirect | 14–16 | Phase 3, 4 | backlog |
| 6. Tests | 17–20 | Phase 1–5 | backlog |

---

## Tasks

### Task 1: Add route patterns and URL builders for `/load/journal` to `routes.tsx`

**Objective:** Provide canonical path patterns and builders for `/load/journal` and `/load/journal/:date`.

**Files:**
- Modify: `playground/src/lib/routes.tsx`

**Step 1: Add route patterns**

Add to `ROUTE_PATTERNS`:

```typescript
  loadJournal: '/load/journal',
  loadJournalDate: '/load/journal/:date',
```

**Step 2: Add builder functions after `loadPath()`**

```typescript
/** /load/journal?zip=<encoded> */
export function loadJournalPath(encodedZip: string): string {
  return `/load/journal?zip=${encodeURIComponent(encodedZip)}`;
}

/** /load/journal/<date>?zip=<encoded> */
export function loadJournalDatePath(encodedZip: string, date: string): string {
  return `/load/journal/${encodeURIComponent(date)}?zip=${encodeURIComponent(encodedZip)}`;
}
```

**Step 3: Verify no regressions**

Run: `bun x tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add playground/src/lib/routes.tsx
git commit -m "feat(routes): add /load/journal and /load/journal/:date route builders"
```

---

### Task 2: Export `JOURNAL_BLANK_TEMPLATE` from `journalEntryFlow.ts`

**Objective:** Make the blank journal template available for zip-load journal creation.

**Files:**
- Modify: `playground/src/services/journalEntryFlow.ts`

**Step 1: Verify `JOURNAL_BLANK_TEMPLATE` is already exported**

```bash
grep "export const JOURNAL_BLANK_TEMPLATE" playground/src/services/journalEntryFlow.ts
```

Expected: `export const JOURNAL_BLANK_TEMPLATE = ...`

**No code change needed** — it's already exported. Mark as verified and move on.

---

### Task 3: Add `/load/journal` routes to `App.tsx`

**Objective:** Register the new journal zip-load routes in the router.

**Files:**
- Modify: `playground/src/App.tsx`

**Step 1: Import new route patterns**

```typescript
import {
  ROUTE_PATTERNS,
  // ... existing imports ...
} from './lib/routes'
```

**Step 2: Add routes in the `<Routes>` block**

After the existing `/load` route (around line 645):

```typescript
                  <Route path={ROUTE_PATTERNS.load} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><LoadZipPage /></Suspense>} />
                  <Route path={ROUTE_PATTERNS.loadJournal} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><LoadZipPage /></Suspense>} />
                  <Route path={ROUTE_PATTERNS.loadJournalDate} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><LoadZipPage /></Suspense>} />
```

**Step 3: Type check**

Run: `bun x tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add playground/src/App.tsx
git commit -m "feat(app): register /load/journal and /load/journal/:date routes"
```

---

### Task 4: Create `parseJournalDate` utility

**Objective:** Parse and validate a `YYYY-MM-DD` date string from the route param. Returns a `Date` object. Throws on invalid format.

**Files:**
- Create: `playground/src/services/parseJournalDate.ts`

**Step 1: Write the utility**

```typescript
/**
 * parseJournalDate — parse a YYYY-MM-DD date string.
 *
 * - `'YYYY-MM-DD'` → returns a Date at local midnight
 * - anything else → throws `Error` with descriptive message
 */
export function parseJournalDate(input: string): Date {
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(
      `Invalid date format: "${input}". Expected "YYYY-MM-DD".`
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1; // 0-based
  const day = Number(match[3]);

  const date = new Date(year, month, day);

  // Validate the constructed date matches the input (catches 2024-02-30, etc.)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid calendar date: "${input}".`);
  }

  return date;
}
```

**Step 2: Write the test file**

Create: `playground/src/services/parseJournalDate.test.ts`

```typescript
import { describe, it, expect } from 'bun:test';
import { parseJournalDate } from './parseJournalDate';

describe('parseJournalDate', () => {
  it('parses valid YYYY-MM-DD', () => {
    const result = parseJournalDate('2024-06-15');
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(5); // June is 5
    expect(result.getDate()).toBe(15);
  });

  it('throws on malformed date', () => {
    expect(() => parseJournalDate('06-15-2024')).toThrow('Invalid date format');
  });

  it('throws on invalid calendar date', () => {
    expect(() => parseJournalDate('2024-02-30')).toThrow('Invalid calendar date');
  });

  it('throws on garbage input', () => {
    expect(() => parseJournalDate('not-a-date')).toThrow('Invalid date format');
  });
});
```

**Step 3: Run tests**

Run: `bun test playground/src/services/parseJournalDate.test.ts --preload ./tests/unit-setup.ts`
Expected: All 4 tests PASS

**Step 4: Commit**

```bash
git add playground/src/services/parseJournalDate.ts playground/src/services/parseJournalDate.test.ts
git commit -m "feat(services): add parseJournalDate utility with tests"
```

---

### Task 5: Create `isDateInPast` helper

**Objective:** Determine if a given date (at midnight) is strictly before today (at midnight). Used for backdate detection.

**Files:**
- Create: `playground/src/services/dateUtils.ts`

**Step 1: Write the helper**

```typescript
/**
 * isDateInPast — check if `date` is strictly before today (local time).
 *
 * Both dates are compared at midnight local time.
 */
export function isDateInPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const compare = new Date(date);
  compare.setHours(0, 0, 0, 0);

  return compare.getTime() < today.getTime();
}
```

**Step 2: Write the test**

Create: `playground/src/services/dateUtils.test.ts`

```typescript
import { describe, it, expect } from 'bun:test';
import { isDateInPast } from './dateUtils';

describe('isDateInPast', () => {
  it('returns true for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isDateInPast(yesterday)).toBe(true);
  });

  it('returns false for today', () => {
    expect(isDateInPast(new Date())).toBe(false);
  });

  it('returns false for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isDateInPast(tomorrow)).toBe(false);
  });

  it('returns true for a date far in the past', () => {
    expect(isDateInPast(new Date(2020, 0, 1))).toBe(true);
  });
});
```

**Step 3: Run tests**

Run: `bun test playground/src/services/dateUtils.test.ts --preload ./tests/unit-setup.ts`
Expected: All 4 tests PASS

**Step 4: Commit**

```bash
git add playground/src/services/dateUtils.ts playground/src/services/dateUtils.test.ts
git commit -m "feat(services): add isDateInPast helper with tests"
```

---

### Task 6: Create `formatDateKey` helper

**Objective:** Convert a Date to the canonical `YYYY-MM-DD` string used for journal note IDs.

**Files:**
- Modify: `playground/src/services/dateUtils.ts`

**Step 1: Add the function**

```typescript
/**
 * formatDateKey — convert a Date to `YYYY-MM-DD` string (local time).
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

**Step 2: Add tests**

Add to `playground/src/services/dateUtils.test.ts`:

```typescript
import { formatDateKey } from './dateUtils';

describe('formatDateKey', () => {
  it('formats a date correctly', () => {
    expect(formatDateKey(new Date(2024, 5, 15))).toBe('2024-06-15');
  });

  it('pads single-digit month and day', () => {
    expect(formatDateKey(new Date(2024, 0, 5))).toBe('2024-01-05');
  });
});
```

**Step 3: Run tests**

Run: `bun test playground/src/services/dateUtils.test.ts --preload ./tests/unit-setup.ts`
Expected: All 6 tests PASS

**Step 4: Commit**

```bash
git add playground/src/services/dateUtils.ts playground/src/services/dateUtils.test.ts
git commit -m "feat(services): add formatDateKey helper"
```

---

### Task 7: Create `useJournalZipProcessor` hook

**Objective:** Handle the journal-specific zip-load flow: decode zip, parse date from route params, check for backdate, create/update journal entry, redirect.

**Files:**
- Create: `playground/src/hooks/useJournalZipProcessor.ts`

**Step 1: Write the hook**

```typescript
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryState } from 'nuqs';
import { decodeZip } from '../services/decodeZip';
import { parseJournalDate } from '../services/parseJournalDate';
import { isDateInPast, formatDateKey } from '../services/dateUtils';
import { playgroundDB, PlaygroundDBService } from '../services/playgroundDB';
import { journalEntryPath } from '../lib/routes';

export type BackdatePrompt = {
  dateKey: string;
  content: string;
} | null;

export function useJournalZipProcessor() {
  const navigate = useNavigate();
  const { date: dateParam } = useParams<{ date: string }>();
  const [zipParam] = useQueryState('zip');
  const [zParam] = useQueryState('z');
  const [backdatePrompt, setBackdatePrompt] = useState<BackdatePrompt>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const zip = zipParam || zParam;
    if (!zip || isProcessing) return;

    let cancelled = false;
    setIsProcessing(true);

    (async () => {
      try {
        const content = await decodeZip(zip);
        if (cancelled) return;

        // If no date param, use today
        const targetDate = dateParam ? parseJournalDate(dateParam) : new Date();
        const dateKey = formatDateKey(targetDate);

        // If date is in the past, prompt user before writing
        if (dateParam && isDateInPast(targetDate)) {
          setBackdatePrompt({ dateKey, content });
          setIsProcessing(false);
          return;
        }

        await saveJournalEntry(dateKey, content);
        if (!cancelled) {
          navigate(journalEntryPath(dateKey), { replace: true });
        }
      } catch (err) {
        console.error('Failed to process journal zip:', err);
        if (!cancelled) {
          navigate('/journal', { replace: true });
        }
      } finally {
        if (!cancelled) setIsProcessing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [zipParam, zParam, dateParam, navigate, isProcessing]);

  const confirmBackdate = async () => {
    if (!backdatePrompt) return;
    const { dateKey, content } = backdatePrompt;
    await saveJournalEntry(dateKey, content);
    setBackdatePrompt(null);
    navigate(journalEntryPath(dateKey), { replace: true });
  };

  const cancelBackdate = () => {
    setBackdatePrompt(null);
    navigate('/journal', { replace: true });
  };

  return { backdatePrompt, confirmBackdate, cancelBackdate, isProcessing };
}

async function saveJournalEntry(dateKey: string, content: string): Promise<void> {
  const pageId = PlaygroundDBService.pageId('journal', dateKey);
  const existing = await playgroundDB.getPage(pageId);

  const baseContent = existing?.content ?? `# ${dateKey}\n`;
  const updatedContent = baseContent.trimEnd() + '\n\n' + content.trimStart();

  await playgroundDB.savePage({
    id: pageId,
    category: 'journal',
    name: dateKey,
    content: updatedContent,
    updatedAt: Date.now(),
  });
}
```

**Step 2: Commit**

```bash
git add playground/src/hooks/useJournalZipProcessor.ts
git commit -m "feat(hooks): add useJournalZipProcessor for /load/journal zip-load flow"
```

---

### Task 8: Modify `useZipProcessor` to branch on route pathname

**Objective:** Keep `useZipProcessor` as the single entry point. When the route is `/load/journal` or `/load/journal/:date`, skip playground logic entirely.

**Files:**
- Modify: `playground/src/hooks/useZipProcessor.ts`

**Step 1: Use `useLocation` to detect journal routes**

```typescript
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryState } from 'nuqs';
import { playgroundPath, ROUTE_PATTERNS } from '../lib/routes';
import { decodeZip } from '../services/decodeZip';
import { playgroundDB, PlaygroundDBService } from '../services/playgroundDB';
import { formatPlaygroundTimestampId } from '@/lib/playgroundDisplay';
import { useJournalZipProcessor } from './useJournalZipProcessor';

export function useZipProcessor() {
  const navigate = useNavigate();
  const location = useLocation();
  const [zipParam, setZipParam] = useQueryState('zip');
  const [zParam, setZParam] = useQueryState('z');

  // Journal routes are handled by a separate hook
  const isJournalRoute = location.pathname.startsWith('/load/journal');
  useJournalZipProcessor();

  useEffect(() => {
    // Skip if this is a journal route (handled by useJournalZipProcessor)
    if (isJournalRoute) return;

    const zip = zipParam || zParam;
    if (!zip) return;

    let cancelled = false;
    (async () => {
      try {
        const content = await decodeZip(zip);
        if (cancelled) return;
        const now = Date.now();
        const id = formatPlaygroundTimestampId(now);
        const pageId = PlaygroundDBService.pageId('playground', id);
        await playgroundDB.savePage({
          id: pageId,
          category: 'playground',
          name: id,
          content,
          updatedAt: now,
        });

        if (!cancelled) {
          navigate(playgroundPath(id), { replace: true });
        }
      } catch (err) {
        console.error('Failed to decode zip:', err);
        if (!cancelled) {
          navigate(ROUTE_PATTERNS.playgroundRoot, { replace: true });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [zipParam, zParam, navigate, setZipParam, setZParam, isJournalRoute]);
}
```

**Step 2: Type check**

Run: `bun x tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add playground/src/hooks/useZipProcessor.ts playground/src/hooks/useJournalZipProcessor.ts
git commit -m "feat(hooks): branch useZipProcessor on /load/journal routes"
```

---

### Task 9: Create `BackdateConfirmModal` component

**Objective:** A reusable modal that prompts the user to confirm creating an entry for a past date.

**Files:**
- Create: `playground/src/components/BackdateConfirmModal.tsx`

**Step 1: Write the component**

```typescript
import { Button } from '@/components/atoms/button';

export interface BackdateConfirmModalProps {
  dateKey: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BackdateConfirmModal({
  dateKey,
  onConfirm,
  onCancel,
}: BackdateConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Backdate Journal Entry?
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          The date <strong>{dateKey}</strong> is in the past. Are you sure you
          want to create a journal entry for this date?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Create Entry</Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add playground/src/components/BackdateConfirmModal.tsx
git commit -m "feat(components): add BackdateConfirmModal for past-date journal entries"
```

---

### Task 10: Wire `BackdateConfirmModal` into `LoadZipPage`

**Objective:** Render the backdate modal when the journal processor signals a backdate prompt.

**Files:**
- Modify: `playground/src/pages/LoadZipPage.tsx`

**Step 1: Import and use the journal processor state**

```typescript
/**
 * LoadZipPage — /load?zip=<base64>
 *               /load/journal?zip=<base64>
 *               /load/journal/<date>?zip=<base64>
 *
 * Decodes a base64-encoded zip from the query string, saves it as a playground
 * page or journal entry (depending on route), then redirects.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryState } from 'nuqs'
import { useJournalZipProcessor } from '../hooks/useJournalZipProcessor'
import { BackdateConfirmModal } from '../components/BackdateConfirmModal'

export function LoadZipPage() {
  const navigate = useNavigate()
  const [zip] = useQueryState('zip')
  const [z] = useQueryState('z')
  const { backdatePrompt, confirmBackdate, cancelBackdate } = useJournalZipProcessor()

  // Robust check: was there a zip in the search string on mount?
  const [hasZipOnMount] = useState(() => {
    const s = window.location.search
    return s.includes('zip=') || s.includes('z=')
  })

  useEffect(() => {
    // Only redirect if there's no zip in state AND no zip was present on mount.
    // If a zip WAS present on mount, useZipProcessor (global) is handling it.
    if (!zip && !z && !hasZipOnMount) {
      navigate('/', { replace: true })
    }
  }, [zip, z, navigate, hasZipOnMount])

  return (
    <>
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading…
      </div>
      {backdatePrompt && (
        <BackdateConfirmModal
          dateKey={backdatePrompt.dateKey}
          onConfirm={confirmBackdate}
          onCancel={cancelBackdate}
        />
      )}
    </>
  )
}
```

**Step 2: Type check**

Run: `bun x tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add playground/src/pages/LoadZipPage.tsx playground/src/components/BackdateConfirmModal.tsx
git commit -m "feat(pages): wire BackdateConfirmModal into LoadZipPage"
```

---

### Task 11: Add `openInJournal` service function

**Objective:** Provide a programmatic way to open content in a journal entry (mirror of `openInPlayground.ts`).

**Files:**
- Create: `playground/src/services/openInJournal.ts`

**Step 1: Write the service**

```typescript
/**
 * openInJournal — encode content and navigate to /load/journal?zip=...
 *                 or /load/journal/<date>?zip=...
 *
 * Mirrors openInPlayground but targets journal entries instead.
 */

import type { NavigateFunction } from 'react-router-dom';
import { encodeZip } from './encodeZip';
import { loadJournalPath, loadJournalDatePath } from '../lib/routes';

export interface OpenInJournalOptions {
  /** Raw markdown content to load into the journal */
  content: string;
  /** Target date (YYYY-MM-DD). Omit for today's entry. */
  date?: string;
}

/** Build the journal load URL and navigate to it. */
export async function openInJournal(
  options: OpenInJournalOptions,
  navigate: NavigateFunction,
): Promise<void> {
  const encoded = await encodeZip(options.content);
  const url = options.date
    ? loadJournalDatePath(encoded, options.date)
    : loadJournalPath(encoded);
  const { pathname, search } = new URL(url, window.location.origin);
  navigate(`${pathname}${search}`);
}

/** Copy the journal load URL to the clipboard. */
export async function copyJournalLink(options: OpenInJournalOptions): Promise<string> {
  const encoded = await encodeZip(options.content);
  const url = options.date
    ? loadJournalDatePath(encoded, options.date)
    : loadJournalPath(encoded);
  const href = new URL(url, window.location.origin).href;
  await navigator.clipboard.writeText(href);
  return href;
}
```

**Step 2: Commit**

```bash
git add playground/src/services/openInJournal.ts
git commit -m "feat(services): add openInJournal service for journal zip-load URLs"
```

---

### Task 12: Add `shareToJournal` WOD block action

**Objective:** Allow users to share a WOD block directly to today's journal (or a specific date).

**Files:**
- Modify: `playground/src/services/openInPlayground.ts` (or create separate file)

**Decision:** Keep it separate to avoid mixing concerns. The existing `openInPlayground.ts` stays playground-only.

**No task needed** — `openInJournal.ts` from Task 11 is sufficient. Future UI can import from there.

---

### Task 13: Update `App.tsx` to ensure `useJournalZipProcessor` is active

**Objective:** Verify that `GlobalState` (which calls `useZipProcessor`) correctly triggers the journal processor.

**Files:**
- Read: `playground/src/App.tsx` lines 605–611

Current code:
```typescript
function GlobalState() {
  useZipProcessor()
  return null
}
```

Since `useZipProcessor` now calls `useJournalZipProcessor()`, and `useJournalZipProcessor` uses `useParams` which requires a matching route, the new `/load/journal*` routes in Task 3 ensure the hook runs correctly.

**Verification step:**

Run: `bun x tsc --noEmit`
Expected: No errors

---

### Task 14: Write integration test for journal zip-load (today)

**Objective:** Verify that `/load/journal?zip=<encoded>` creates a journal entry for today and redirects.

**Files:**
- Create: `playground/src/hooks/useJournalZipProcessor.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import React from 'react';
import { useJournalZipProcessor } from './useJournalZipProcessor';
import { playgroundDB } from '../services/playgroundDB';
import { encodeZip } from '../services/encodeZip';

function Wrapper({ children, initialEntries }: { children: React.ReactNode; initialEntries?: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries ?? ['/load/journal?zip=test']}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </MemoryRouter>
  );
}

describe('useJournalZipProcessor', () => {
  beforeEach(async () => {
    await playgroundDB.clearAll();
  });

  it('creates a journal entry for today when no date is provided', async () => {
    const content = '# Test Workout\n\n```wod\n10:00 Run\n```\n';
    const encoded = await encodeZip(content);

    const { result } = renderHook(() => useJournalZipProcessor(), {
      wrapper: ({ children }) => (
        <Wrapper initialEntries={[`/load/journal?zip=${encoded}`]}>
          {children}
        </Wrapper>
      ),
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
    }, { timeout: 3000 });

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    const page = await playgroundDB.getPage(`journal/${dateKey}`);
    expect(page).toBeDefined();
    expect(page!.content).toContain('10:00 Run');
  });
});
```

**Note:** This test may need adjustment based on the actual test harness available. If `@testing-library/react` is not installed, use a simpler approach with mock hooks.

**Alternative simpler test** (if testing library is unavailable):

Create: `playground/src/services/openInJournal.test.ts`

```typescript
import { describe, it, expect } from 'bun:test';
import { loadJournalPath, loadJournalDatePath } from '../lib/routes';

describe('loadJournalPath', () => {
  it('builds URL for today', () => {
    const url = loadJournalPath('abc123');
    expect(url).toBe('/load/journal?zip=abc123');
  });
});

describe('loadJournalDatePath', () => {
  it('builds URL with date', () => {
    const url = loadJournalDatePath('abc123', '2024-06-15');
    expect(url).toBe('/load/journal/2024-06-15?zip=abc123');
  });
});
```

**Step 2: Run tests**

Run: `bun test playground/src/services/openInJournal.test.ts --preload ./tests/unit-setup.ts`
Expected: 2 tests PASS

**Step 3: Commit**

```bash
git add playground/src/services/openInJournal.test.ts
git commit -m "test(services): add journal load URL builder tests"
```

---

### Task 15: Write test for backdate prompt

**Objective:** Verify that a past date triggers the backdate prompt instead of immediate redirect.

**Files:**
- Create: `playground/src/hooks/useJournalZipProcessor.backdate.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import React from 'react';
import { useJournalZipProcessor } from './useJournalZipProcessor';
import { playgroundDB } from '../services/playgroundDB';
import { encodeZip } from '../services/encodeZip';

function Wrapper({ children, initialEntries }: { children: React.ReactNode; initialEntries: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </MemoryRouter>
  );
}

describe('useJournalZipProcessor backdate', () => {
  beforeEach(async () => {
    await playgroundDB.clearAll();
  });

  it('sets backdatePrompt for past dates', async () => {
    const content = '# Past Workout\n';
    const encoded = await encodeZip(content);
    const pastDate = '2020-01-15';

    const { result } = renderHook(() => useJournalZipProcessor(), {
      wrapper: ({ children }) => (
        <Wrapper initialEntries={[`/load/journal/${pastDate}?zip=${encoded}`]}>
          {children}
        </Wrapper>
      ),
    });

    await waitFor(() => {
      expect(result.current.backdatePrompt).not.toBeNull();
    }, { timeout: 3000 });

    expect(result.current.backdatePrompt!.dateKey).toBe('2020-01-15');
    expect(result.current.backdatePrompt!.content).toContain('Past Workout');

    // Verify no journal entry was created yet
    const page = await playgroundDB.getPage('journal/2020-01-15');
    expect(page).toBeUndefined();
  });
});
```

**Step 2: Commit**

```bash
git add playground/src/hooks/useJournalZipProcessor.backdate.test.ts
git commit -m "test(hooks): add backdate prompt test for journal zip processor"
```

---

### Task 16: Write test for future date (no prompt)

**Objective:** Verify that future dates create the entry immediately without prompting.

**Files:**
- Create: `playground/src/hooks/useJournalZipProcessor.future.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import React from 'react';
import { useJournalZipProcessor } from './useJournalZipProcessor';
import { playgroundDB } from '../services/playgroundDB';
import { encodeZip } from '../services/encodeZip';

function Wrapper({ children, initialEntries }: { children: React.ReactNode; initialEntries: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </MemoryRouter>
  );
}

describe('useJournalZipProcessor future date', () => {
  beforeEach(async () => {
    await playgroundDB.clearAll();
  });

  it('creates entry immediately for future dates', async () => {
    const content = '# Future Workout\n';
    const encoded = await encodeZip(content);
    // Set a date 30 days in the future
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const y = future.getFullYear();
    const m = String(future.getMonth() + 1).padStart(2, '0');
    const d = String(future.getDate()).padStart(2, '0');
    const futureDate = `${y}-${m}-${d}`;

    const { result } = renderHook(() => useJournalZipProcessor(), {
      wrapper: ({ children }) => (
        <Wrapper initialEntries={[`/load/journal/${futureDate}?zip=${encoded}`]}>
          {children}
        </Wrapper>
      ),
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.backdatePrompt).toBeNull();

    const page = await playgroundDB.getPage(`journal/${futureDate}`);
    expect(page).toBeDefined();
    expect(page!.content).toContain('Future Workout');
  });
});
```

**Step 2: Commit**

```bash
git add playground/src/hooks/useJournalZipProcessor.future.test.ts
git commit -m "test(hooks): add future date immediate creation test"
```

---

### Task 17: Run full test suite

**Objective:** Ensure no regressions in existing tests.

**Files:** All modified files

**Step 1: Run playground-specific tests**

```bash
bun run test:playground
```

Expected: All existing tests pass, new tests pass.

**Step 2: Run type check**

```bash
bun x tsc --noEmit
```

Expected: No TypeScript errors.

**Step 3: Commit any fixes**

If failures, fix and commit with `fix: ...` messages.

---

### Task 18: Update documentation / comments

**Objective:** Document the new `/load/journal` routes in the relevant files.

**Files:**
- Modify: `playground/src/pages/LoadZipPage.tsx` (update header comment)
- Modify: `playground/src/hooks/useZipProcessor.ts` (update header comment)

**Step 1: Update `LoadZipPage.tsx` header**

```typescript
/**
 * LoadZipPage — /load?zip=<base64>
 *               /load/journal?zip=<base64>
 *               /load/journal/<date>?zip=<base64>
 *
 * Decodes a base64-encoded zip from the query string:
 *   - /load: saves as a playground page, redirects to /playground/:id
 *   - /load/journal: saves as today's journal entry, redirects to /journal/:dateKey
 *   - /load/journal/<date>: saves as specific date entry
 *                 - future/today → redirect immediately
 *                 - past date → shows backdate confirmation modal first
 *
 * If no zip parameter is present the user is redirected to /.
 */
```

**Step 2: Update `useZipProcessor.ts` header**

```typescript
/**
 * useZipProcessor — Global zip-load handler for playground and journal pages.
 *
 * Reads ?zip= or ?z= from the URL, decodes the content, and:
 *   - On /load: saves as a new playground page in IndexedDB, redirects to /playground/:id
 *   - On /load/journal*: delegates to useJournalZipProcessor
 */
```

**Step 3: Commit**

```bash
git add playground/src/pages/LoadZipPage.tsx playground/src/hooks/useZipProcessor.ts
git commit -m "docs: update zip-load comments for /load/journal routes"
```

---

### Task 19: Manual verification checklist

**Objective:** Verify the feature works end-to-end in a browser.

**Steps:**

1. **Start dev server:**
   ```bash
   bun run storybook
   ```
   (Or however the playground app is served — check package.json scripts)

2. **Test playground mode (regression):**
   - Open `/load?zip=<encoded>` with any encoded content
   - Verify redirect to `/playground/:id`
   - Verify content is loaded

3. **Test journal today mode:**
   - Encode some markdown: `await encodeZip('# Test\n\nHello')`
   - Open `/load/journal?zip=<encoded>`
   - Verify redirect to `/journal/YYYY-MM-DD` (today's date)
   - Verify content is appended to the journal entry

4. **Test journal future date:**
   - Open `/load/journal/2099-01-01?zip=<encoded>`
   - Verify redirect to `/journal/2099-01-01`
   - Verify entry created immediately

5. **Test journal past date (backdate):**
   - Open `/load/journal/2020-01-01?zip=<encoded>`
   - Verify modal appears: "Backdate Journal Entry?"
   - Click Cancel → verify redirect to `/journal`
   - Click Create Entry → verify redirect to `/journal/2020-01-01`
   - Verify content is saved

6. **Test invalid date:**
   - Open `/load/journal/bad-date?zip=<encoded>`
   - Verify redirect to `/journal` (graceful error handling)

---

### Task 20: Final review and cleanup

**Objective:** Ensure code quality, DRY, and no leftover debug code.

**Checklist:**
- [ ] No `console.log` debug statements (except existing error logs)
- [ ] All new files have proper headers/comments
- [ ] No hard-coded paths outside `routes.tsx`
- [ ] `useJournalZipProcessor` properly cleans up on unmount (`cancelled` flag)
- [ ] Backdate modal is accessible (keyboard navigation, focus trap if needed)
- [ ] IndexedDB writes use existing `playgroundDB` service (no new DB schemas)
- [ ] Date handling is consistent with existing `journalWorkout.ts` patterns

**Commit:**

```bash
git add .
git commit -m "feat(journal): complete journal zip-load with backdate prompt

- Add /load/journal and /load/journal/:date route support
- Create journal entries for today or specific dates
- Prompt for confirmation when backdating past entries
- Reuse existing playgroundDB, encodeZip/decodeZip pipeline
- Add comprehensive tests for date parsing, backdate, future dates"
```

---

## Summary of Changes

| File | Action | Lines (approx) |
|------|--------|---------------|
| `playground/src/lib/routes.tsx` | Modify | +20 |
| `playground/src/App.tsx` | Modify | +5 |
| `playground/src/services/parseJournalDate.ts` | Create | +30 |
| `playground/src/services/parseJournalDate.test.ts` | Create | +25 |
| `playground/src/services/dateUtils.ts` | Create | +25 |
| `playground/src/services/dateUtils.test.ts` | Create | +30 |
| `playground/src/hooks/useJournalZipProcessor.ts` | Create | +90 |
| `playground/src/hooks/useZipProcessor.ts` | Modify | +10 |
| `playground/src/components/BackdateConfirmModal.tsx` | Create | +40 |
| `playground/src/pages/LoadZipPage.tsx` | Modify | +15 |
| `playground/src/services/openInJournal.ts` | Create | +40 |
| `playground/src/services/openInJournal.test.ts` | Create | +15 |
| `playground/src/hooks/useJournalZipProcessor.backdate.test.ts` | Create | +40 |
| `playground/src/hooks/useJournalZipProcessor.future.test.ts` | Create | +45 |
| **Total** | | **~430** |

## Key Design Decisions

1. **Route-level mode segmentation:** `/load/journal` and `/load/journal/:date` are distinct routes, not query params. This makes the URL structure explicit and leverages React Router's `useParams` for date extraction.

2. **Single `LoadZipPage` component:** The same page component handles all `/load*` routes. It renders the backdate modal conditionally based on the journal processor's state.

3. **Separate hook:** `useJournalZipProcessor` is a standalone hook called from `useZipProcessor`. This avoids a monolithic hook and makes journal logic independently testable.

4. **Backdate as modal, not route:** The backdate prompt is a modal overlay on `LoadZipPage`, not a separate route. This preserves the URL state (the user can refresh and still see the prompt) and avoids adding transient routes.

5. **Reuse `playgroundDB`:** Journal entries already use `category: 'journal'` in `playgroundDB`. No schema changes needed.

6. **Append, don't overwrite:** When a journal entry exists, the zip content is appended (with `\n\n` separator), matching the behavior of `appendWorkoutToJournal`.

7. **Date parsing strict:** `parseJournalDate` validates both format and calendar correctness, throwing descriptive errors that are caught and handled with a redirect to `/journal`.
