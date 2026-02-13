/**
 * Simple dropdown menu component (without Radix UI)
 * Uses a React portal so content is never clipped by overflow:hidden ancestors.
 */
import * as React from "react"
import * as ReactDOM from "react-dom"
import { cn } from "@/lib/utils"

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
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { isOpen, setIsOpen: handleOpenChange, triggerRef } as any);
        }
        return child;
      })}
    </div>
  );
};

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  triggerRef?: React.RefObject<HTMLDivElement>;
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, children, asChild, isOpen, setIsOpen, triggerRef: _triggerRef, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen?.(!isOpen);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        onClick: handleClick,
      } as any);
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

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  triggerRef?: React.RefObject<HTMLDivElement>;
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, children, align = 'center', isOpen, setIsOpen, triggerRef, ...props }, ref) => {
    const internalRef = React.useRef<HTMLDivElement>(null);
    const contentRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;
    const [position, setPosition] = React.useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

    // Calculate position from trigger element
    React.useEffect(() => {
      if (!isOpen || !triggerRef?.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8, // 8px gap
        left: rect.left,
        width: rect.width,
      });
    }, [isOpen, triggerRef]);

    // Click outside to close
    React.useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        // Don't close if clicking inside the content
        if (contentRef.current && contentRef.current.contains(target)) return;
        // Don't close if clicking the trigger
        if (triggerRef?.current && triggerRef.current.contains(target)) return;
        setIsOpen?.(false);
      };

      // Use setTimeout to avoid the current click event from triggering close
      const id = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(id);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen, setIsOpen, contentRef, triggerRef]);

    if (!isOpen) return null;

    // Compute alignment style
    let posStyle: React.CSSProperties = {
      position: 'fixed',
      top: position.top,
      zIndex: 9999,
    };

    if (align === 'end') {
      posStyle.right = window.innerWidth - position.left - position.width;
    } else if (align === 'start') {
      posStyle.left = position.left;
    } else {
      posStyle.left = position.left + position.width / 2;
      posStyle.transform = 'translateX(-50%)';
    }

    return (ReactDOM as any).createPortal(
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

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, disabled, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      {...props}
    />
  )
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

// Export placeholders for compatibility
export const DropdownMenuGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const DropdownMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const DropdownMenuSub = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const DropdownMenuSubContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const DropdownMenuSubTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const DropdownMenuRadioGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const DropdownMenuCheckboxItem = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const DropdownMenuRadioItem = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const DropdownMenuShortcut = ({ children }: { children: React.ReactNode }) => <>{children}</>;
