/**
 * Clock Sync Validation Story
 *
 * Browser-level integration test fixture for WOD-664.
 * Exercises the Chromecast receiver clock-sync protocol and
 * getRuntimeNowMs() drift-prevention mechanism in a real browser
 * so Playwright can assert on the results.
 */

import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChromecastProxyRuntime } from '@/services/cast/rpc/ChromecastProxyRuntime';
import { getRuntimeNowMs } from '@/runtime/hooks/runtimeNow';
import type { RpcMessage, RpcClockSyncResponse } from '@/services/cast/rpc/RpcMessages';
import type { IRpcTransport, RpcUnsubscribe } from '@/services/cast/rpc/IRpcTransport';

// ── Mock Transport ──────────────────────────────────────────────────────────

class MockTransport implements IRpcTransport {
  connected = true;
  sent: RpcMessage[] = [];
  private messageHandlers = new Set<(msg: RpcMessage) => void>();
  private connHandlers = new Set<() => void>();
  private discHandlers = new Set<() => void>();

  send(message: RpcMessage): void {
    this.sent.push(message);
  }

  onMessage(handler: (message: RpcMessage) => void): RpcUnsubscribe {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnected(handler: () => void): RpcUnsubscribe {
    this.connHandlers.add(handler);
    return () => this.connHandlers.delete(handler);
  }

  onDisconnected(handler: () => void): RpcUnsubscribe {
    this.discHandlers.add(handler);
    return () => this.discHandlers.delete(handler);
  }

  dispose(): void {
    this.messageHandlers.clear();
  }

  receive(message: RpcMessage): void {
    this.messageHandlers.forEach(h => h(message));
  }
}

// ── Test Results Shape ─────────────────────────────────────────────────────

export interface ClockSyncTestResults {
  /** Clock sync request handling: did runtime echo the timestamp? */
  requestTestPassed: boolean;
  /** Delta between receiverTimestamp in response and local Date.now() */
  responseTimestampDeltaMs: number;

  /** Clock sync result handling: does getSenderClockTimeMs() respect offset? */
  resultTestPassed: boolean;
  /** The offset that was applied (positive = receiver ahead) */
  appliedOffsetMs: number;
  /** Delta between actual sender time and expected sender time */
  senderTimeDeltaMs: number;

  /** Did the global __chromecast_senderClockTimeMs get registered? */
  globalRegistered: boolean;
  /** Does the global function return the sender-adjusted time? */
  globalValueCorrect: boolean;

  /** Does getRuntimeNowMs() use the sender clock when available? */
  usesSenderClock: boolean;
  /** Does getRuntimeNowMs() fall back to Date.now() when sender clock is missing? */
  fallbackWorks: boolean;
  /** Does getRuntimeNowMs() fall back when sender clock throws? */
  errorFallbackWorks: boolean;

  /** Drift simulation: is the delta between sender and local ≈ offset? */
  driftTestPassed: boolean;
  /** Actual observed drift in ms */
  observedDriftMs: number;
}

// ── Harness ─────────────────────────────────────────────────────────────────

const ClockSyncHarness: React.FC = () => {
  const [results, setResults] = useState<ClockSyncTestResults | null>(null);

  useEffect(() => {
    const transport = new MockTransport();
    const runtime = new ChromecastProxyRuntime(transport);
    const r: Partial<ClockSyncTestResults> = {};

    // ── Test 1: Receiver responds to rpc-clock-sync-request ──
    const t1 = Date.now();
    transport.receive({ type: 'rpc-clock-sync-request', timestamp: t1 });

    const response = transport.sent.find(
      (m): m is RpcClockSyncResponse => m.type === 'rpc-clock-sync-response'
    );
    r.requestTestPassed = !!response && response.requestTimestamp === t1;
    r.responseTimestampDeltaMs = response
      ? Math.abs(response.receiverTimestamp - Date.now())
      : -1;

    // ── Test 2: Receiver applies offset from rpc-clock-sync-result ──
    const offsetMs = 5000; // receiver clock is 5 s ahead of sender
    const rttMs = 100;
    transport.receive({ type: 'rpc-clock-sync-result', offsetMs, rttMs });

    const senderTime = runtime.getSenderClockTimeMs();
    const localTime = Date.now();
    const expectedSenderTime = localTime - offsetMs;
    r.resultTestPassed = Math.abs(senderTime - expectedSenderTime) < 200;
    r.appliedOffsetMs = offsetMs;
    r.senderTimeDeltaMs = senderTime - expectedSenderTime;

    // ── Test 3: Global registration (mirrors receiver-rpc.tsx) ──
    (window as any).__chromecast_senderClockTimeMs = runtime.getSenderClockTimeMs.bind(runtime);
    r.globalRegistered = typeof (window as any).__chromecast_senderClockTimeMs === 'function';
    const globalValue = (window as any).__chromecast_senderClockTimeMs();
    r.globalValueCorrect = Math.abs(globalValue - expectedSenderTime) < 200;

    // ── Test 4: getRuntimeNowMs() prefers sender clock ──
    const fixedTime = 1234567890123;
    (window as any).__chromecast_senderClockTimeMs = () => fixedTime;
    r.usesSenderClock = getRuntimeNowMs() === fixedTime;

    // ── Test 5: getRuntimeNowMs() falls back to Date.now() ──
    delete (window as any).__chromecast_senderClockTimeMs;
    const beforeFallback = Date.now();
    const fallbackValue = getRuntimeNowMs();
    const afterFallback = Date.now();
    r.fallbackWorks = fallbackValue >= beforeFallback && fallbackValue <= afterFallback;

    // ── Test 6: getRuntimeNowMs() falls back on error ──
    (window as any).__chromecast_senderClockTimeMs = () => {
      throw new Error('Simulated sender clock failure');
    };
    const beforeError = Date.now();
    const errorFallbackValue = getRuntimeNowMs();
    const afterError = Date.now();
    r.errorFallbackWorks =
      errorFallbackValue >= beforeError && errorFallbackValue <= afterError;

    // ── Test 7: Drift simulation ──
    // Reset to a realistic offset and verify sender vs local drift
    const driftOffset = 8000; // 8 seconds ahead
    transport.receive({ type: 'rpc-clock-sync-result', offsetMs: driftOffset, rttMs: 50 });
    (window as any).__chromecast_senderClockTimeMs = runtime.getSenderClockTimeMs.bind(runtime);

    const senderNow = (window as any).__chromecast_senderClockTimeMs();
    const localNow = Date.now();
    r.observedDriftMs = localNow - senderNow;
    r.driftTestPassed = Math.abs(r.observedDriftMs - driftOffset) < 200;

    // Cleanup
    delete (window as any).__chromecast_senderClockTimeMs;

    setResults(r as ClockSyncTestResults);

    return () => {
      runtime.dispose();
    };
  }, []);

  if (!results) {
    return (
      <div data-testid="clock-sync-loading" className="p-8 font-mono text-sm">
        Running clock-sync validation…
      </div>
    );
  }

  return (
    <div data-testid="clock-sync-results" className="p-8 font-mono text-sm">
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  );
};

// ── Storybook Meta ──────────────────────────────────────────────────────────

const meta: Meta<typeof ClockSyncHarness> = {
  title: 'testing/ClockSyncValidation',
  component: ClockSyncHarness,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Clock Sync Protocol & RTT',
};
