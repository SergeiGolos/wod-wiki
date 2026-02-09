import React, { useMemo } from 'react';
import { sharedParser } from '../parser/parserInstance';
import { WodScriptVisualizer } from './WodScriptVisualizer';
import { VisualizerSize, VisualizerFilter } from '../core/models/DisplayItem';

interface ParsedViewProps {
  wodscript: string;
  className?: string;
  /** Display size variant @default 'normal' */
  size?: VisualizerSize;
}

export const ParsedView: React.FC<ParsedViewProps> = ({ 
  wodscript, 
  className = '',
  size = 'normal'
}) => {
  const { statements, error } = useMemo(() => {
    if (!wodscript) return { statements: [], error: null };
    
    const trimmedScript = wodscript.trim();

    try {
      const script = sharedParser.read(trimmedScript);
      
      if (script.errors && script.errors.length > 0) {
        throw new Error(`Parsing errors: ${script.errors.map((e: any) => e.message).join(', ')}`);
      }

      return { statements: script.statements, error: null };
    } catch (e) {
      return { statements: [], error: e as Error };
    }
  }, [wodscript]);

  // Filter configuration for Plan Screen Overlay
  const planFilter: VisualizerFilter = {
    allowedOrigins: [
      'parser',
      'hinted', 
      'collected',
      'user' 
    ]
  };

  if (error) {
    return (
      <div className={`p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 ${className}`}>
        <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">Parse Error</h3>
        <pre className="text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap font-mono">
          {error.message}
        </pre>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-hidden flex flex-col ${className}`}>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <WodScriptVisualizer 
          statements={statements} 
          size={size}
          filter={planFilter}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default ParsedView;
