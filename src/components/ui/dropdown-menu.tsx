/**
 * Simple dropdown menu component (without Radix UI)
 */
import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children, open, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(open ?? false);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <div className="relative inline-block">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { isOpen, setIsOpen: handleOpenChange } as any);
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
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, children, asChild, isOpen, setIsOpen, ...props }, ref) => {
    const handleClick = () => {
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
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, children, align = 'center', isOpen, setIsOpen, ...props }, ref) => {
    const internalRef = React.useRef<HTMLDivElement>(null);
    const contentRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;

    React.useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          setIsOpen?.(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, setIsOpen, contentRef]);

    if (!isOpen) return null;

    const alignClass = align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2';

    return (
      <div
        ref={contentRef}
        className={cn(
          "absolute top-full mt-2 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          alignClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
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
