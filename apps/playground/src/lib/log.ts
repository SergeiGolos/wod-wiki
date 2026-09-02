/**
 * Thin logger for app-level diagnostics — the single sanctioned access point
 * to `console` outside transport debugging. All call sites log through these
 * helpers so the eslint `no-console` rule stays satisfied everywhere else.
 * Mirrors `services/cast/rpc/rpcLogger.ts`.
 */

export function appLog(prefix: string, ...args: unknown[]): void {
  /* eslint-disable-next-line no-console -- logger module: only console access point */
  console.log(`[${prefix}]`, ...args);
}

export function appWarn(prefix: string, ...args: unknown[]): void {
  /* eslint-disable-next-line no-console -- logger module: only console access point */
  console.warn(`[${prefix}]`, ...args);
}

export function appError(prefix: string, ...args: unknown[]): void {
  /* eslint-disable-next-line no-console -- logger module: only console access point */
  console.error(`[${prefix}]`, ...args);
}
