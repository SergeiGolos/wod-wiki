import React, { useRef, useEffect } from 'react';
import { useQueryState } from 'nuqs';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

export const TEXT_FILTER_NAVIGATION_EVENT = 'wodwiki:text-filter-navigation';

export interface TextFilterNavigationDetail {
  key: string;
  scopeId: string;
}

interface TextFilterStripProps {
  /** URL query param name to read/write (default: 'q') */
  paramName?: string;
  /** Input placeholder text */
  placeholder?: string;
  /** Whether to auto-focus the input on mount */
  autoFocus?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Scope id used to route keyboard navigation commands to a matching list */
  navigationScope?: string;
}

/**
 * TextFilterStrip
 *
 * A self-contained URL-aware text search/filter bar.
 * Reads and writes a URL param (default `q`) so it can be placed
 * in the page shell sticky header without prop-drilling callbacks.
 *
 * Usable on any page that needs a text filter: Search, Collections, etc.
 */
export const TextFilterStrip: React.FC<TextFilterStripProps> = ({
  paramName = 'q',
  placeholder = 'Search…',
  autoFocus = false,
  className,
  navigationScope,
}) => {
  const [value, setValue] = useQueryState(paramName, { defaultValue: '' });
  const scopeId = navigationScope ?? paramName;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If pressing '/' and not already in an input/textarea
      if (e.key === '/' && 
          document.activeElement?.tagName !== 'INPUT' && 
          document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) return;

    const navigationEvent = new CustomEvent<TextFilterNavigationDetail>(TEXT_FILTER_NAVIGATION_EVENT, {
      detail: {
        key: event.key,
        scopeId,
      },
      cancelable: true,
    });

    window.dispatchEvent(navigationEvent);

    if (navigationEvent.defaultPrevented) {
      event.preventDefault();
    }
  };

  return (
    <div className={cn('flex items-center gap-3 px-6 lg:px-10 pb-3', className)}>
      <MagnifyingGlassIcon className="size-5 text-muted-foreground shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm sm:text-base font-medium"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          aria-label="Clear"
          className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
};
