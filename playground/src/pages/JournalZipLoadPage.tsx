/**
 * JournalZipLoadPage
 *
 * Preview page for journal zip-load URLs.
 * Displays decoded content as rendered markdown with split-button import toolbar.
 * Routes: /load/journal and /load/journal/:date
 *
 * Handles:
 * - Loading state while decoding zip
 * - Error state with retry
 * - Preview of decoded markdown content
 * - Import toolbar (Today / Plan future / Backdate confirmation)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJournalZipProcessor } from '../hooks/useJournalZipProcessor';
import { JournalImportToolbar } from '../components/JournalImportToolbar';
import { BackdateConfirmModal } from '../components/BackdateConfirmModal';
import type { Components } from 'react-markdown';

// ── Markdown rendering components ─────────────────────────────────────────────

const markdownComponents: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold mt-8 mb-4 first:mt-0 text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl font-bold mt-6 mb-3 text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl font-semibold mt-5 mb-2 text-foreground">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-base font-semibold mt-3 mb-1 text-foreground">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-sm font-semibold mt-2 mb-1 text-muted-foreground">{children}</h6>
  ),
  
  // Paragraphs and text
  p: ({ children }) => (
    <p className="text-sm leading-relaxed mb-4 text-muted-foreground">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-muted-foreground">{children}</em>
  ),
  
  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-4 text-sm text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-4 text-sm text-muted-foreground">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="ml-2">{children}</li>
  ),
  
  // Code
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-xs">{children}</code>
      );
    }
    return null;
  },
  pre: ({ children }) => (
    <pre className="bg-muted rounded-lg p-4 overflow-x-auto mb-4 text-xs font-mono text-muted-foreground border border-border">
      {children}
    </pre>
  ),
  
  // Quotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/30 pl-4 py-2 mb-4 italic text-muted-foreground text-sm">
      {children}
    </blockquote>
  ),
  
  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline font-medium"
    >
      {children}
    </a>
  ),
  
  // Tables
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded border border-border">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border/50">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-muted/20 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-foreground text-xs">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-muted-foreground">{children}</td>
  ),
  
  // Horizontal rule
  hr: () => (
    <hr className="my-6 border-border/50" />
  ),
};

export function JournalZipLoadPage() {
  const navigate = useNavigate();
  const processorState = useJournalZipProcessor();
  const [showBackdateModal, setShowBackdateModal] = useState(false);
  const [selectedDateForImport, setSelectedDateForImport] = useState<Date | null>(null);

  const { state, content, dateKey, error, onConfirmBackdate, onRetry } = processorState;

  const handleImportToday = async () => {
    if (onConfirmBackdate) {
      await onConfirmBackdate();
    }
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDateForImport(date);

    // Check if date is in the past (show modal)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateNormalized = new Date(date);
    selectedDateNormalized.setHours(0, 0, 0, 0);

    if (selectedDateNormalized < today) {
      // Past date — show backdate modal
      setShowBackdateModal(true);
    } else {
      // Today or future — import directly via the hook
      if (onConfirmBackdate) {
        await onConfirmBackdate();
      }
    }
  };

  const handleBackdateConfirm = async () => {
    if (onConfirmBackdate) {
      setShowBackdateModal(false);
      await onConfirmBackdate();
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with toolbar */}
      <div className="border-b border-border/50 bg-muted/30 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Import Journal Entry</h1>
        </div>

        {/* Toolbar — only show when preview is ready */}
        {state === 'loading' ? (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="inline-block animate-spin">⏳</span>
            Preparing preview...
          </div>
        ) : state === 'error' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
          >
            Retry
          </Button>
        ) : state === 'pending-confirmation' || state === 'creating' ? null : (
          <JournalImportToolbar
            selectedDate={selectedDateForImport}
            onImportToday={handleImportToday}
            onDateSelect={handleDateSelect}
            isLoading={state === 'creating'}
          />
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-96 gap-4">
            <div className="animate-spin">⏳</div>
            <p className="text-muted-foreground text-sm">Loading preview...</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center justify-center min-h-96 gap-4">
            <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 max-w-md">
              <div className="flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Error Loading Preview</h3>
                  <p className="text-sm text-muted-foreground mt-1">{error || 'Failed to decode the zip content'}</p>
                </div>
              </div>
            </div>
            <Button onClick={onRetry} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {state === 'pending-confirmation' && (
          <div className="flex flex-col items-center justify-center min-h-96 gap-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground mb-2">Backdate Confirmation Required</h2>
              <p className="text-muted-foreground text-sm mb-4">
                This date is in the past. Please confirm to proceed.
              </p>
            </div>
          </div>
        )}

        {state === 'creating' && (
          <div className="flex flex-col items-center justify-center min-h-96 gap-4">
            <div className="animate-spin">⏳</div>
            <p className="text-muted-foreground text-sm">Creating journal entry...</p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-96 gap-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground mb-2">✓ Entry Created</h2>
              <p className="text-muted-foreground text-sm">Redirecting...</p>
            </div>
          </div>
        )}

        {(state === 'loading' || state === 'error' || state === 'pending-confirmation' || state === 'creating' || state === 'success') ? null : content ? (
          <article className="prose prose-sm max-w-2xl mx-auto">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
          </article>
        ) : null}
      </div>

      {/* Backdate Confirmation Modal */}
      {showBackdateModal && dateKey && (
        <BackdateConfirmModal
          dateKey={dateKey}
          onConfirm={handleBackdateConfirm}
          onCancel={() => setShowBackdateModal(false)}
          isLoading={state === 'creating'}
        />
      )}
    </div>
  );
}
