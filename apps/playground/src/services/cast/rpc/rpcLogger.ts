/**
 * Thin logger for the cast RPC layer — the single sanctioned access point to
 * `console` for transport debugging. All call sites log through these helpers
 * so the eslint `no-console` rule stays satisfied everywhere else.
 */

export function rpcLog(prefix: string, ...args: unknown[]): void {
    /* eslint-disable-next-line no-console -- logger module: only console access point */
    console.log(`[${prefix}]`, ...args);
}

export function rpcWarn(prefix: string, ...args: unknown[]): void {
    /* eslint-disable-next-line no-console -- logger module: only console access point */
    console.warn(`[${prefix}]`, ...args);
}

export function rpcError(prefix: string, ...args: unknown[]): void {
    /* eslint-disable-next-line no-console -- logger module: only console access point */
    console.error(`[${prefix}]`, ...args);
}
