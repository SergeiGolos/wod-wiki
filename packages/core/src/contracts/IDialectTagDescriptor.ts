/**
 * Tag-Identity Registry Contract
 *
 * Single source of truth for dialect fence tags and runnable state,
 * as defined in docs/adr/dialect-block-alignment.md and docs/adr/language-pack-api.md.
 */
export interface IDialectTagDescriptor {
  /** Canonical fence tag (e.g. 'time', 'climb', 'wod') */
  readonly tag: string;
  /** Optional fence aliases (e.g. ['whiteboard', 'wod']) */
  readonly aliases?: readonly string[];
  /** Optional human-readable name */
  readonly name?: string;
  /** Whether blocks using this dialect produce runnable executions */
  readonly runnable?: boolean;
}
