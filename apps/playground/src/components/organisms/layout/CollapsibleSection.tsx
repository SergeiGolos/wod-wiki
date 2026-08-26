/**
 * CollapsibleSection - A reusable collapsible section component
 * 
 * Features:
 * - Click on heading to toggle collapse/expand
 * - Animated transitions
 * - Visual indicators for expand/collapse state
 * - Customizable styling
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CollapsibleSectionProps {
  /** Section title displayed in the header */
  title: React.ReactNode;
  
  /** Content to show when expanded */
  children: React.ReactNode;
  
  /** Whether the section is initially expanded */
  defaultExpanded?: boolean;
  
  /** Controlled expanded state */
  expanded?: boolean;
  
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
  
  /** Icon to show before the title */
  icon?: React.ReactNode;
  
  /** Badge or status to show after the title */
  badge?: React.ReactNode;
  
  /** Actions to show on the right side of the header */
  actions?: React.ReactNode;
  
  /** Header depth level (affects styling) */
  level?: 1 | 2 | 3;
  
  /** Whether to show border around section */
  bordered?: boolean;
  
  /** Whether content has padding */
  contentPadded?: boolean;
  
  /** Additional CSS classes for the container */
  className?: string;
  
  /** Additional CSS classes for the header */
  headerClassName?: string;
  
  /** Additional CSS classes for the content */
  contentClassName?: string;
}

/**
 * CollapsibleSection Component
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandedChange,
  icon,
  badge,
  actions,
  level = 2,
  bordered = false,
  contentPadded = true,
  className,
  headerClassName,
  contentClassName,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  
  // Use controlled or uncontrolled state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
  const handleToggle = () => {
    const newExpanded = !isExpanded;
    if (onExpandedChange) {
      onExpandedChange(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
  };

  // Style variants based on level
  const headerSizeClasses = {
    1: 'text-base font-semibold py-3 px-4',
    2: 'text-sm font-medium py-2 px-3',
    3: 'text-xs font-medium py-1.5 px-2',
  };

  const chevronSizeClasses = {
    1: 'h-5 w-5',
    2: 'h-4 w-4',
    3: 'h-3.5 w-3.5',
  };

  return (
    <div
      className={cn(
        'rounded-md transition-all duration-200',
        bordered && 'border border-border',
        className
      )}
    >
      {/* Clickable Header */}
      <div
        className={cn(
          'flex items-center gap-2 cursor-pointer select-none',
          'hover:bg-muted/50 rounded-md transition-colors',
          headerSizeClasses[level],
          headerClassName
        )}
        onClick={handleToggle}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        {/* Expand/Collapse Indicator */}
        <div className="flex-shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className={chevronSizeClasses[level]} />
          ) : (
            <ChevronRight className={chevronSizeClasses[level]} />
          )}
        </div>

        {/* Optional Icon */}
        {icon && (
          <div className="flex-shrink-0 text-muted-foreground">
            {icon}
          </div>
        )}

        {/* Title */}
        <div className="flex-1 truncate">
          {title}
        </div>

        {/* Badge */}
        {badge && (
          <div className="flex-shrink-0">
            {badge}
          </div>
        )}

        {/* Actions (stop propagation to prevent toggle) */}
        {actions && (
          <div 
            className="flex-shrink-0 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>

      {/* Collapsible Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className={cn(
          contentPadded && 'px-4 pb-3',
          contentClassName
        )}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
