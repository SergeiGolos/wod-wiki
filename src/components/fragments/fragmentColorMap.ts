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
  timer: 'bg-blue-100 border-blue-200 text-blue-800',
  rep: 'bg-green-100 border-green-200 text-green-800',
  effort: 'bg-yellow-100 border-yellow-200 text-yellow-800',
  distance: 'bg-teal-100 border-teal-200 text-teal-800',
  rounds: 'bg-purple-100 border-purple-200 text-purple-800',
  action: 'bg-pink-100 border-pink-200 text-pink-800',
  increment: 'bg-indigo-100 border-indigo-200 text-indigo-800',
  lap: 'bg-orange-100 border-orange-200 text-orange-800',
  text: 'bg-gray-100 border-gray-200 text-gray-800',
  resistance: 'bg-red-100 border-red-200 text-red-800',
};

/**
 * Get color classes for a fragment type
 * @param type - Fragment type string (case-insensitive)
 * @returns Tailwind CSS color classes for the type
 */
export function getFragmentColorClasses(type: string): string {
  const normalizedType = type.toLowerCase() as FragmentType;
  
  // Return mapped color or fallback for unknown types
  return fragmentColorMap[normalizedType] || 'bg-gray-200 border-gray-300 text-gray-800';
}
