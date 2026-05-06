/**
 * ShortcutBadge.tsx
 *
 * Keyboard shortcut indicator used in command-palette list items.
 * Renders one <kbd> token per shortcut key, normalising common modifier
 * names to their OS symbols (⌘ ⇧ ⌥).
 */

export interface ShortcutBadgeProps {
  tokens: string[];
  delimiter?: string;
}

function renderToken(token: string): string {
  return token === 'meta' ? '⌘' : token === 'shift' ? '⇧' : token === 'alt' ? '⌥' : token;
}

export function ShortcutBadge({ tokens, delimiter }: ShortcutBadgeProps) {
  return (
    <span className="flex items-center gap-0.5 ml-auto shrink-0">
      {tokens.map((token, i) => (
        <>
          {i > 0 && delimiter ? (
            <span
              key={`delimiter-${i}`}
              aria-hidden="true"
              className="px-0.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500"
            >
              {delimiter}
            </span>
          ) : null}
          <kbd
            key={`token-${i}`}
            className="inline-flex items-center rounded border border-zinc-300 bg-zinc-100 px-1 py-0.5 text-[10px] font-mono text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            {renderToken(token)}
          </kbd>
        </>
      ))}
    </span>
  );
}

export default ShortcutBadge;
