import { cn } from '@/lib/utils';
import type { IListItem, ListItemContext } from './types';

interface DefaultListItemProps<TPayload> {
  item: IListItem<TPayload>;
  ctx: ListItemContext;
}

function ShortcutBadge({ tokens }: { tokens: string[] }) {
  return (
    <span className="flex items-center gap-0.5 ml-auto shrink-0">
      {tokens.map((token, i) => (
        <kbd
          key={i}
          className="inline-flex items-center rounded border border-zinc-300 bg-zinc-100 px-1 py-0.5 text-[10px] font-mono text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        >
          {token === 'meta' ? '⌘' : token === 'shift' ? '⇧' : token === 'alt' ? '⌥' : token}
        </kbd>
      ))}
    </span>
  );
}

export function DefaultListItem<TPayload>({ item, ctx }: DefaultListItemProps<TPayload>) {
  const primaryAction = ctx.actions.find(a => a.isPrimary);
  const secondaryActions = ctx.actions.filter(a => !a.isPrimary);

  return (
    <div
      role="option"
      aria-selected={ctx.isSelected}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer select-none',
        'text-sm transition-colors',
        ctx.isActive || ctx.isSelected
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
      item.isDisabled && 'opacity-40 pointer-events-none',
        item.depth && item.depth > 0 ? `pl-${Math.min(item.depth * 4 + 3, 16)}` : '',
      )}
      onClick={item.isDisabled ? undefined : ctx.onSelect}
    >
      {/* Leading icon */}
      {item.icon && (
        <span className="shrink-0 text-zinc-400 dark:text-zinc-500 w-4 h-4 flex items-center justify-center">
          {item.icon}
        </span>
      )}

      {/* Label + subtitle */}
      <span className="flex flex-col min-w-0 flex-1">
        <span className="truncate font-medium leading-tight">{item.label}</span>
        {item.subtitle && (
          <span className="truncate text-xs text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
            {item.subtitle}
          </span>
        )}
      </span>

      {/* Badge */}
      {item.badge !== undefined && (
        <span className="shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
          {item.badge}
        </span>
      )}

      {/* Shortcut */}
      {item.shortcut && item.shortcut.length > 0 && (
        <ShortcutBadge tokens={item.shortcut} />
      )}

      {/* Secondary actions (shown on hover via group) */}
      {secondaryActions.length > 0 && (
        <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
          {secondaryActions.map(action => (
            <button
              key={action.id}
              title={action.label}
              className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600"
              onClick={e => {
                e.stopPropagation();
                ctx.executeAction(action.action);
              }}
            >
              {action.icon ?? action.label}
            </button>
          ))}
        </span>
      )}

      {/* Primary action button */}
      {primaryAction && (
        <button
          title={primaryAction.label}
          className="shrink-0 rounded px-2 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={e => {
            e.stopPropagation();
            ctx.executeAction(primaryAction.action);
          }}
        >
          {primaryAction.icon ?? primaryAction.label}
        </button>
      )}
    </div>
  );
}
