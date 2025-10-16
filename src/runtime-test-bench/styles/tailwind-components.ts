// Runtime Test Bench UI - Standard Tailwind Component Classes
// Reusable CSS classes for consistent styling across components
// Uses standard design system colors and patterns

// ============================================================================
// PANEL CLASSES
// ============================================================================

/**
 * Base panel styling for all RTB panels
 * Standard theme with card background and borders
 */
export const panelBase = [
  'bg-card',
  'border',
  'border-border',
  'rounded-lg',
  'shadow-sm',
  'overflow-hidden',
].join(' ');

/**
 * Panel header styling
 * Consistent header appearance across all panels
 */
export const panelHeader = [
  'px-4',
  'py-3',
  'border-b',
  'border-border',
  'bg-muted/50',
  'flex',
  'items-center',
  'justify-between',
].join(' ');

/**
 * Panel header title styling
 */
export const panelHeaderTitle = [
  'text-foreground',
  'font-semibold',
  'text-sm',
  'uppercase',
  'tracking-wide',
].join(' ');

/**
 * Panel content area styling
 */
export const panelContent = [
  'p-4',
  'h-full',
  'overflow-auto',
  'bg-card',
].join(' ');

/**
 * Panel footer styling
 */
export const panelFooter = [
  'px-4',
  'py-3',
  'border-t',
  'border-border',
  'bg-muted/50',
  'flex',
  'items-center',
  'justify-between',
].join(' ');

// ============================================================================
// BUTTON CLASSES
// ============================================================================

/**
 * Primary button styling
 * Standard primary color for main actions
 */
export const buttonPrimary = [
  'px-4',
  'py-2',
  'bg-primary',
  'text-primary-foreground',
  'font-medium',
  'text-sm',
  'rounded-md',
  'hover:bg-primary/90',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-primary',
  'focus:ring-offset-2',
  'focus:ring-offset-background',
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
  'transition-colors',
  'duration-200',
].join(' ');

/**
 * Secondary button styling
 * Standard secondary color for alternative actions
 */
export const buttonSecondary = [
  'px-4',
  'py-2',
  'bg-secondary',
  'text-secondary-foreground',
  'font-medium',
  'text-sm',
  'rounded-md',
  'hover:bg-secondary/80',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-secondary',
  'focus:ring-offset-2',
  'focus:ring-offset-background',
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
  'transition-colors',
  'duration-200',
].join(' ');

/**
 * Success button styling
 * Green accent for positive actions
 */
export const buttonSuccess = [
  'px-4',
  'py-2',
  'bg-green-600',
  'text-white',
  'font-medium',
  'text-sm',
  'rounded-md',
  'hover:bg-green-700',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-green-500',
  'focus:ring-offset-2',
  'focus:ring-offset-background',
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
  'transition-colors',
  'duration-200',
].join(' ');

/**
 * Error button styling
 * Red accent for destructive actions
 */
export const buttonError = [
  'px-4',
  'py-2',
  'bg-destructive',
  'text-destructive-foreground',
  'font-medium',
  'text-sm',
  'rounded-md',
  'hover:bg-destructive/90',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-destructive',
  'focus:ring-offset-2',
  'focus:ring-offset-background',
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
  'transition-colors',
  'duration-200',
].join(' ');

/**
 * Icon button styling
 * Square buttons for icon-only actions
 */
export const buttonIcon = [
  'p-2',
  'bg-transparent',
  'text-muted-foreground',
  'rounded-md',
  'hover:bg-muted',
  'hover:text-foreground',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-ring',
  'focus:ring-offset-2',
  'focus:ring-offset-background',
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
  'transition-colors',
  'duration-200',
].join(' ');

// ============================================================================
// CARD CLASSES
// ============================================================================

/**
 * Base card styling
 * Used for list items, entries, and small content blocks
 */
export const cardBase = [
  'bg-background',
  'border',
  'border-border',
  'rounded-md',
  'p-3',
  'hover:border-muted-foreground/20',
  'transition-colors',
  'duration-200',
].join(' ');

/**
 * Card with hover effects
 * Enhanced interactivity for selectable items
 */
export const cardInteractive = [
  ...cardBase.split(' '),
  'cursor-pointer',
  'hover:bg-muted/50',
  'hover:shadow-sm',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-ring',
  'focus:ring-offset-2',
  'focus:ring-offset-background',
].join(' ');

/**
 * Highlighted card styling
 * For active/selected states
 */
export const cardHighlighted = [
  'bg-primary',
  'border-primary',
  'text-primary-foreground',
  'rounded-md',
  'p-3',
  'shadow-sm',
].join(' ');

/**
 * Error card styling
 * For error states and validation messages
 */
export const cardError = [
  'bg-destructive',
  'border-destructive',
  'text-destructive-foreground',
  'rounded-md',
  'p-3',
].join(' ');

// ============================================================================
// TEXT CLASSES
// ============================================================================

/**
 * Primary text styling
 * Main content text color
 */
export const textPrimary = 'text-foreground';

/**
 * Secondary text styling
 * Muted text for labels and metadata
 */
export const textSecondary = 'text-muted-foreground';

/**
 * Success text styling
 */
export const textSuccess = 'text-green-600';

/**
 * Error text styling
 */
export const textError = 'text-destructive';

/**
 * Info text styling
 */
export const textInfo = 'text-blue-600';

/**
 * Code text styling
 * Monospace font for code and technical content
 */
export const textCode = [
  'font-mono',
  'text-sm',
  'text-foreground',
  'bg-muted',
  'px-1',
  'py-0.5',
  'rounded',
].join(' ');

// ============================================================================
// LAYOUT CLASSES
// ============================================================================

/**
 * Flex row layout
 */
export const flexRow = 'flex items-center';

/**
 * Flex column layout
 */
export const flexCol = 'flex flex-col';

/**
 * Space between items
 */
export const spaceBetween = 'justify-between';

/**
 * Center items
 */
export const centerItems = 'justify-center items-center';

/**
 * Full height container
 */
export const fullHeight = 'h-full';

/**
 * Scrollable container
 */
export const scrollable = 'overflow-auto';

// ============================================================================
// STATUS CLASSES
// ============================================================================

/**
 * Status indicator base
 */
export const statusBase = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';

/**
 * Idle status
 */
export const statusIdle = `${statusBase} bg-muted text-muted-foreground`;

/**
 * Executing status
 */
export const statusExecuting = `${statusBase} bg-blue-600 text-white`;

/**
 * Completed status
 */
export const statusCompleted = `${statusBase} bg-green-600 text-white`;

/**
 * Error status
 */
export const statusError = `${statusBase} bg-destructive text-destructive-foreground`;

/**
 * Paused status
 */
export const statusPaused = `${statusBase} bg-yellow-600 text-white`;

// ============================================================================
// UTILITY CLASSES
// ============================================================================

/**
 * Truncate text with ellipsis
 */
export const truncateText = 'truncate';

/**
 * Hide scrollbar but keep functionality
 */
export const hideScrollbar = [
  'scrollbar-hide',
  '::-webkit-scrollbar { display: none; }',
  'scrollbar-width: none;',
  '-ms-overflow-style: none;',
].join(' ');

/**
 * Focus ring for accessibility
 */
export const focusRing = [
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-ring',
  'focus:ring-offset-2',
  'focus:ring-offset-background',
].join(' ');

/**
 * Animation classes
 */
export const animateFadeIn = 'animate-in fade-in duration-200';
export const animateSlideIn = 'animate-in slide-in-from-left duration-300';

// ============================================================================
// COMPONENT-SPECIFIC CLASSES
// ============================================================================

/**
 * Editor panel specific classes
 */
export const editorContainer = [
  panelContent,
  'p-0', // Override padding for full-width editor
].join(' ');

/**
 * Memory panel list styling
 */
export const memoryList = [
  'space-y-2',
  'max-h-96',
  scrollable,
].join(' ');

/**
 * Stack panel hierarchy styling
 */
export const stackHierarchy = [
  'space-y-1',
  'pl-4',
  'border-l-2',
  'border-border',
].join(' ');

/**
 * Toolbar button group
 */
export const toolbarButtonGroup = [
  'flex',
  'items-center',
  'space-x-2',
  'px-4',
  'py-2',
].join(' ');

/**
 * Status footer layout
 */
export const statusFooterLayout = [
  'flex',
  'items-center',
  'justify-between',
  'text-sm',
].join(' ');

// ============================================================================
// RESPONSIVE CLASSES
// ============================================================================

/**
 * Desktop layout (1920px+)
 */
export const layoutDesktop = 'grid grid-cols-1 lg:grid-cols-2 gap-6';

/**
 * Tablet layout (768px-1919px)
 */
export const layoutTablet = 'flex flex-col space-y-4';

/**
 * Mobile layout (<768px)
 */
export const layoutMobile = 'flex flex-col space-y-2';

// ============================================================================
// EXPORT OBJECT
// ============================================================================

/**
 * Complete component class library
 * Import and use these classes in React components
 */
export const rtbClasses = {
  // Panels
  panelBase,
  panelHeader,
  panelHeaderTitle,
  panelContent,
  panelFooter,

  // Buttons
  buttonPrimary,
  buttonSecondary,
  buttonSuccess,
  buttonError,
  buttonIcon,

  // Cards
  cardBase,
  cardInteractive,
  cardHighlighted,
  cardError,

  // Text
  textPrimary,
  textSecondary,
  textSuccess,
  textError,
  textInfo,
  textCode,

  // Layout
  flexRow,
  flexCol,
  spaceBetween,
  centerItems,
  fullHeight,
  scrollable,

  // Status
  statusIdle,
  statusExecuting,
  statusCompleted,
  statusError,
  statusPaused,

  // Utilities
  truncateText,
  hideScrollbar,
  focusRing,
  animateFadeIn,
  animateSlideIn,

  // Component-specific
  editorContainer,
  memoryList,
  stackHierarchy,
  toolbarButtonGroup,
  statusFooterLayout,

  // Responsive
  layoutDesktop,
  layoutTablet,
  layoutMobile,
} as const;