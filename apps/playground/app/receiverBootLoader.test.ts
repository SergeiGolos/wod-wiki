import { afterEach, describe, expect, it } from 'bun:test';
import {
  armReceiverBootFallback,
  dismissReceiverBootLoader,
  RECEIVER_BOOT_DEGRADED_STATUS,
} from './receiverBootLoader';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('receiver boot loader recovery', () => {
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
});
