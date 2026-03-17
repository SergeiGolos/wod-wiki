/**
 * WodPlaygroundButton
 *
 * Split pill that: (a) opens the Playground pre-loaded with a WOD
 * block's content, and (b) copies that URL to the clipboard.
 *
 * URL format: {origin}/#/load?zip=<gzip+base64 encoded markdown>
 *
 * The `?zip=` param is decoded by the playground's LoadZipPage component,
 * which saves it as a new page in IndexedDB and redirects to #/playground/{uuid}.
 */

import React, { useCallback, useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

/**
 * Gzip-compress a string and return a URL-safe base64 representation.
 * Falls back to plain base64 if CompressionStream is unavailable (e.g. older
 * browser / non-secure context — very unlikely in modern Storybook).
 */
export async function gzipBase64(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);

  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      const reader = cs.readable.getReader();
      writer.write(bytes);
      writer.close();

      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const len = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Uint8Array(len);
      let off = 0;
      for (const c of chunks) { merged.set(c, off); off += c.length; }
      return btoa(String.fromCharCode(...merged))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch { /* fall through */ }
  }

  // Fallback: plain base64 (no compression)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Builds the full absolute playground URL for the given WOD content string
 * (raw inner content of the wod fence, without the opening/closing fences).
 */
export async function buildPlaygroundUrl(wodContent: string): Promise<string> {
  // Wrap in a markdown wod fence so the playground receives valid markdown
  const markdown = `\`\`\`wod\n${wodContent.trimEnd()}\n\`\`\`\n`;
  const encoded = await gzipBase64(markdown);
  const base = window.location.origin;
  return `${base}/#/load?zip=${encoded}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface WodPlaygroundButtonProps {
  /** Raw inner WOD content (without the surrounding ``` fences) */
  wodContent: string;
  className?: string;
}

/** Copy-state: idle | copying | copied */
type CopyState = 'idle' | 'copying' | 'copied';

export const WodPlaygroundButton: React.FC<WodPlaygroundButtonProps> = ({
  wodContent,
  className,
}) => {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [href, setHref] = useState<string>('#');

  // Lazily compute the URL the first time the user interacts with either half.
  // Avoids doing async work on every render that contains a WOD block.
  const resolveUrl = useCallback(async (): Promise<string> => {
    if (href !== '#') return href;
    const url = await buildPlaygroundUrl(wodContent);
    setHref(url);
    return url;
  }, [href, wodContent]);

  const handleLinkClick = useCallback(async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const url = await resolveUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [resolveUrl]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (copyState === 'copying') return;
    setCopyState('copying');
    try {
      const url = await resolveUrl();
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      setCopyState('idle');
    }
  }, [copyState, resolveUrl]);

  return (
    <div
      className={cn(
        'inline-flex items-stretch rounded-sm overflow-hidden text-[10px] font-medium shadow-sm border border-border/60',
        'bg-muted text-muted-foreground',
        className,
      )}
      title="Open in Playground"
    >
      {/* Left half — open link */}
      <a
        href={href}
        onClick={handleLinkClick}
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
        )}
        rel="noopener noreferrer"
      >
        <ExternalLink className="h-2.5 w-2.5" />
        <span>Playground</span>
      </a>

      {/* Divider */}
      <div className="w-px bg-border/60 self-stretch" />

      {/* Right half — copy URL */}
      <button
        onClick={handleCopy}
        disabled={copyState === 'copying'}
        className={cn(
          'flex items-center justify-center px-1.5 py-0.5 transition-colors',
          copyState === 'copied'
            ? 'text-emerald-500 bg-emerald-500/10'
            : 'hover:bg-accent hover:text-accent-foreground',
        )}
        title="Copy playground link to clipboard"
        type="button"
      >
        {copyState === 'copied'
          ? <Check className="h-2.5 w-2.5" />
          : <Copy className="h-2.5 w-2.5" />
        }
      </button>
    </div>
  );
};
