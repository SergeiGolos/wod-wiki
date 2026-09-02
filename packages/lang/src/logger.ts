/**
 * Sanctioned access point for `packages/lang` runtime warnings.
 *
 * Centralising console access here lets the rest of the package satisfy
 * eslint's `no-console` rule. Use `langWarn` instead of inlining
 * `console.warn` calls.
 */
export function langWarn(message: string): void {
    /* eslint-disable-next-line no-console -- logger module: only console access point */
    console.warn(message);
}
