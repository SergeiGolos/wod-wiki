/**
 * Dropdown menu component — controlled wrapper with portal-based positioning.
 *
 * Keeps the existing controlled API (open / onOpenChange) for backward
 * compatibility with ~10 callers.  Internals use a React portal so content
 * is never clipped by overflow:hidden ancestors.
 */
import * as React from "react"
import * as ReactDOM from "react-dom"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// DropdownMenu — controlled state wrapper
// ---------------------------------------------------------------------------

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children, open, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(open ?? false);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  // Sync controlled open prop
  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <div ref={triggerRef} className="relative inline-block">
      {React.Children.map(children, (child) => {
        if (React.isValidElement<DropdownMenuChildProps>(child)) {
          return React.cloneElement(child, { isOpen, setIsOpen: handleOpenChange, triggerRef });
        }
        return child;
      })}
    </div>
  );
};

// Props injected by DropdownMenu into its children
interface DropdownMenuChildProps {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  triggerRef?: React.RefObject<HTMLDivElement | null>;
}

// ---------------------------------------------------------------------------
// DropdownMenuTrigger
// ---------------------------------------------------------------------------

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  triggerRef?: React.RefObject<HTMLDivElement | null>;
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, children, asChild, isOpen, setIsOpen, triggerRef: _triggerRef, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen?.(!isOpen);
    };

    if (asChild && React.isValidElement<React.HTMLAttributes<HTMLElement>>(children)) {
      return React.cloneElement(children, {
        ...props,
        onClick: handleClick,
      } as React.HTMLAttributes<HTMLElement>);
    }

    return (
      <button
        ref={ref}
        className={className}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

// ---------------------------------------------------------------------------
// DropdownMenuContent
// ---------------------------------------------------------------------------

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  triggerRef?: React.RefObject<HTMLDivElement | null>;
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, children, align = 'center', side = 'bottom', isOpen, setIsOpen, triggerRef, ...props }, ref) => {
    const internalRef = React.useRef<HTMLDivElement>(null);
    const contentRef = (ref as React.RefObject<HTMLDivElement | null>) || internalRef;
    const [position, setPosition] = React.useState<{ top: number; bottom: number; left: number; width: number }>({ top: 0, bottom: 0, left: 0, width: 0 });

    // Calculate position from trigger element
    React.useEffect(() => {
      if (!isOpen || !triggerRef?.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width: rect.width,
      });
    }, [isOpen, triggerRef]);

    // Click outside to close
    React.useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (contentRef.current && contentRef.current.contains(target)) return;
        if (triggerRef?.current && triggerRef.current.contains(target)) return;
        setIsOpen?.(false);
      };

      const id = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(id);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen, setIsOpen, contentRef, triggerRef]);

    if (!isOpen) return null;

    const posStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
    };

    if (side === 'top') {
      posStyle.bottom = position.bottom;
    } else {
      posStyle.top = position.top;
    }

    if (align === 'end') {
      posStyle.right = window.innerWidth - position.left - position.width;
    } else if (align === 'start') {
      posStyle.left = position.left;
    } else {
      posStyle.left = position.left + position.width / 2;
      posStyle.transform = 'translateX(-50%)';
    }

    return ReactDOM.createPortal(
      <div
        ref={contentRef}
        className={cn(
          "min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          className
        )}
        style={posStyle}
        {...props}
      >
        {children}
      </div>,
      document.body
    );
  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

// ---------------------------------------------------------------------------
// DropdownMenuItem
// ---------------------------------------------------------------------------

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
  inset?: boolean;
}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, disabled, inset, ...props }, ref) => (
    <div
      ref={ref}
      role="menuitem"
      aria-disabled={disabled}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground",
        inset && "pl-8",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      tabIndex={disabled ? -1 : 0}
      {...props}
    />
  )
);
DropdownMenuItem.displayName = "DropdownMenuItem";

// ---------------------------------------------------------------------------
// DropdownMenuLabel
// ---------------------------------------------------------------------------

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

// ---------------------------------------------------------------------------
// DropdownMenuSeparator
// ---------------------------------------------------------------------------

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

// ---------------------------------------------------------------------------
// DropdownMenuHeading — section heading inside a dropdown menu
// ---------------------------------------------------------------------------

export function DropdownMenuHeading({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DropdownMenuShortcut — keyboard shortcut display
// ---------------------------------------------------------------------------

export function DropdownMenuShortcut({
  keys,
  className,
  ...props
}: { keys: string | string[]; className?: string } & React.ComponentPropsWithoutRef<'kbd'>) {
  const keyList = typeof keys === 'string' ? [keys] : keys;
  return (
    <kbd
      {...props}
      className={cn(
        "ml-auto inline-flex items-center gap-0.5 text-xs tracking-widest text-muted-foreground",
        className
      )}
    >
      {keyList.map((key, i) => (
        <React.Fragment key={i}>
          <span>{key}</span>
          {i < keyList.length - 1 && <span>+</span>}
        </React.Fragment>
      ))}
    </kbd>
  );
}
