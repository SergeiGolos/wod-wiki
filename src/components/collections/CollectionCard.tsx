import React from 'react';
import { ChevronRight, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WodCollectionItem } from '@/repositories/wod-collections';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && val) meta[key] = val;
  }
  return meta;
}

/** Pull the first sentence / phrase from ## Description, or the first non-header line. */
function extractDescription(content: string): string {
  const body = content.replace(/^---[\s\S]*?---\r?\n*/, '');
  const descMatch = body.match(/##\s+Description\r?\n+([\s\S]*?)(?:\n##|\n```|\n\n\n|$)/);
  if (descMatch) {
    const text = descMatch[1]
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
    return text.slice(0, 160);
  }
  const lines = body.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('**'));
  return lines[0]?.trim().slice(0, 160) ?? '';
}

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner:     'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  advanced:     'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  elite:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export interface CollectionCardProps {
  item: WodCollectionItem;
  collectionId: string;
  collectionName: string;
  onClick: () => void;
  className?: string;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  item,
  collectionName,
  onClick,
  className,
}) => {
  const meta = parseFrontmatter(item.content);
  const description = extractDescription(item.content);
  const difficulty = meta['Difficulty']?.toLowerCase() ?? meta['difficulty']?.toLowerCase() ?? '';
  const difficultyColor = DIFFICULTY_COLOR[difficulty] ?? 'bg-muted text-muted-foreground';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full text-left rounded-lg border border-border bg-card',
        'hover:border-primary/50 hover:shadow-sm',
        'transition-all duration-150 p-4 flex flex-col gap-2',
        className,
      )}
    >
      {/* Title + chevron */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm text-foreground leading-tight group-hover:text-primary transition-colors">
          {item.name}
        </h3>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>

      {/* Collection label */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
        <Tag className="h-2.5 w-2.5" />
        <span>{collectionName}</span>
      </div>

      {/* Metadata badges */}
      {(meta['Category'] ?? meta['category'] ?? meta['Type'] ?? meta['type'] ?? meta['Difficulty'] ?? meta['difficulty']) && (
        <div className="flex flex-wrap gap-1.5">
          {(meta['Category'] ?? meta['category']) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {meta['Category'] ?? meta['category']}
            </span>
          )}
          {(meta['Type'] ?? meta['type']) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
              {meta['Type'] ?? meta['type']}
            </span>
          )}
          {(meta['Difficulty'] ?? meta['difficulty']) && (
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', difficultyColor)}>
              {meta['Difficulty'] ?? meta['difficulty']}
            </span>
          )}
        </div>
      )}

      {/* Description snippet */}
      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}
    </button>
  );
};
