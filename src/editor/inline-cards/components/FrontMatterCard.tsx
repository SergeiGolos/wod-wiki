/**
 * FrontMatterCard - Preview/Edit component for front matter cards
 * 
 * Supports two display modes:
 * - full-preview: Shows properties in a clean table format
 * - side-by-side: Shows raw YAML on left, table on right
 */

import React from 'react';
import { FrontMatterContent, FrontMatterCardProps } from '../types';

export const FrontMatterCard: React.FC<FrontMatterCardProps> = ({ card, callbacks }) => {
  const content = card.content as FrontMatterContent;
  const { properties, rawYaml } = content;
  const { displayMode } = card;
  
  const PropertyTable = () => (
    <table className="w-full text-sm">
      <tbody>
        {Object.entries(properties).map(([key, value]) => (
          <tr key={key} className="border-b border-border last:border-0">
            <td className="py-1.5 pr-4 font-semibold text-muted-foreground whitespace-nowrap">{key}</td>
            <td className="py-1.5 text-foreground">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  
  if (displayMode === 'side-by-side') {
    return (
      <div className="frontmatter-card-split grid grid-cols-2 gap-2 h-full border border-border rounded-lg overflow-hidden bg-card">
        {/* Left: Raw YAML */}
        <div className="frontmatter-card-source border-r border-border p-3 bg-muted/20">
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-amber-500 rounded-full" />
            YAML (click to edit)
          </div>
          <pre 
            className="text-xs font-mono whitespace-pre-wrap cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
            onClick={callbacks.onEdit}
          >
            {rawYaml}
          </pre>
        </div>
        
        {/* Right: Property table */}
        <div className="frontmatter-card-preview p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
            Properties
          </div>
          <PropertyTable />
        </div>
      </div>
    );
  }
  
  // Full preview mode
  return (
    <div 
      className="frontmatter-card-preview p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={callbacks.onEdit}
      title="Click to edit"
    >
      <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-amber-500 rounded-full" />
        Front Matter
      </div>
      <PropertyTable />
    </div>
  );
};
