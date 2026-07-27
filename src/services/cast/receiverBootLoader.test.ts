import { afterEach, describe, expect, it } from 'bun:test';
import {
  armReceiverBootFallback,
  dismissReceiverBootLoader,
  getReceiverWaitingScreenCopy,
  RECEIVER_BOOT_DEGRADED_STATUS,
  RECEIVER_BOOT_STANDALONE_STATUS,
  RECEIVER_BOOT_START_FAILURE_STATUS,
  receiverStandaloneModeEnabled,
} from './receiverBootLoader';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('receiverBootLoader', () => {
  it('dismisses the loader on the normal READY path', async () => {
    document.body.innerHTML = '<div id="initial-loader" style="opacity: 1; display: flex;"></div>';

    expect(dismissReceiverBootLoader('ready', 5)).toBe(true);

    const loader = document.getElementById('initial-loader');
    expect(loader?.style.opacity).toBe('0');
    expect(loader?.dataset.bootDismissed).toBe('ready');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(loader?.style.display).toBe('none');
  });

  it('falls back to a degraded waiting shell when READY never fires', async () => {
    document.body.innerHTML = '<div id="initial-loader" style="opacity: 1; display: flex;"></div>';

    let status = 'waiting-for-cast';
    armReceiverBootFallback(() => {
      status = RECEIVER_BOOT_DEGRADED_STATUS;
      dismissReceiverBootLoader('timeout', 5);
    }, 5);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const loader = document.getElementById('initial-loader');
    expect(status).toBe(RECEIVER_BOOT_DEGRADED_STATUS);
    expect(loader?.style.opacity).toBe('0');
    expect(loader?.dataset.bootDismissed).toBe('timeout');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(loader?.style.display).toBe('none');
  });

  it('detects explicit standalone browser mode', () => {
    expect(receiverStandaloneModeEnabled('?receiverMode=standalone')).toBe(true);
    expect(receiverStandaloneModeEnabled('?standalone=1')).toBe(true);
    expect(receiverStandaloneModeEnabled('?standalone=true')).toBe(true);
    expect(receiverStandaloneModeEnabled('?receiverMode=cast')).toBe(false);
  });

  it('returns standalone waiting copy', () => {
    expect(getReceiverWaitingScreenCopy(RECEIVER_BOOT_STANDALONE_STATUS)).toEqual({
      title: 'Standalone receiver mode',
      description: 'Receiver UI is running without CAF so you can test the waiting shell in a normal browser.',
      isError: false,
    });
  });

  it('returns degraded waiting copy', () => {
    expect(getReceiverWaitingScreenCopy(RECEIVER_BOOT_DEGRADED_STATUS)).toEqual({
      title: 'Ready for cast',
      description: 'CAF is unavailable, so the receiver is showing its fallback waiting shell instead of a blank loader.',
      isError: false,
    });
  });

  it('returns recovery copy for startup failure', () => {
    expect(getReceiverWaitingScreenCopy(RECEIVER_BOOT_START_FAILURE_STATUS)).toEqual({
      title: 'Receiver fallback mode',
      description: 'Receiver startup failed, but the waiting shell is still available for browser testing and recovery.',
      isError: true,
    });
  });
});
