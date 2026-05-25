export const RECEIVER_BOOT_READY_TIMEOUT_MS = 8000;
export const RECEIVER_BOOT_FADE_MS = 500;
export const RECEIVER_BOOT_DEGRADED_STATUS = 'waiting-for-cast (degraded)';

type BootLoaderDismissReason = 'ready' | 'timeout';

/**
 * Dismiss the initial boot overlay with the same fade the HTML shell uses.
 * Returns false when the overlay is already gone or never mounted.
 */
export function dismissReceiverBootLoader(
  reason: BootLoaderDismissReason,
  fadeMs: number = RECEIVER_BOOT_FADE_MS,
): boolean {
  const loader = document.getElementById('initial-loader');
  if (!loader || loader.dataset.bootDismissed === 'true') {
    return false;
  }

  loader.dataset.bootDismissed = reason;
  loader.style.opacity = '0';

  window.setTimeout(() => {
    loader.style.display = 'none';
  }, fadeMs);

  return true;
}

/**
 * Arm the fallback that recovers from a missing CAF READY event.
 */
export function armReceiverBootFallback(
  onTimeout: () => void,
  timeoutMs: number = RECEIVER_BOOT_READY_TIMEOUT_MS,
): ReturnType<typeof setTimeout> {
  return window.setTimeout(onTimeout, timeoutMs);
}
