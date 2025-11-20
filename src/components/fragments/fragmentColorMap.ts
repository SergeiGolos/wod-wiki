// Fragment color mapping utility for visualization

export type FragmentType = 
  | 'timer' 
  | 'rep' 
  | 'effort' 
  | 'distance' 
  | 'rounds' 
  | 'action' 
  | 'increment' 
  | 'lap' 
  | 'text' 
  | 'resistance';

export type FragmentColorMap = {
  readonly [key in FragmentType]: string;
};

/**
 * Color classes for each fragment type using Tailwind CSS
 * Each entry includes background, border, and text colors
 */
export const fragmentColorMap: FragmentColorMap = {
  timer: 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/50 dark:border-blue-800 dark:text-blue-100',
  rep: 'bg-green-100 border-green-200 text-green-800 dark:bg-green-900/50 dark:border-green-800 dark:text-green-100',
  effort: 'bg-yellow-100 border-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-800 dark:text-yellow-100',
  distance: 'bg-teal-100 border-teal-200 text-teal-800 dark:bg-teal-900/50 dark:border-teal-800 dark:text-teal-100',
  rounds: 'bg-purple-100 border-purple-200 text-purple-800 dark:bg-purple-900/50 dark:border-purple-800 dark:text-purple-100',
  action: 'bg-pink-100 border-pink-200 text-pink-800 dark:bg-pink-900/50 dark:border-pink-800 dark:text-pink-100',
  increment: 'bg-indigo-100 border-indigo-200 text-indigo-800 dark:bg-indigo-900/50 dark:border-indigo-800 dark:text-indigo-100',
  lap: 'bg-orange-100 border-orange-200 text-orange-800 dark:bg-orange-900/50 dark:border-orange-800 dark:text-orange-100',
  text: 'bg-gray-100 border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100',
  resistance: 'bg-red-100 border-red-200 text-red-800 dark:bg-red-900/50 dark:border-red-800 dark:text-red-100',
};

/**
 * Get color classes for a fragment type
 * @param type - Fragment type string (case-insensitive)
 * @returns Tailwind CSS color classes for the type
 */
export function getFragmentColorClasses(type: string): string {
  const normalizedType = type.toLowerCase() as FragmentType;
  
  // Return mapped color or fallback for unknown types
  return fragmentColorMap[normalizedType] || 'bg-gray-200 border-gray-300 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';
}
