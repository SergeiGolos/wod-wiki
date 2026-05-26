/**
 * LoadJournalZipPage — /load/journal?zip=<zip> or /load/journal/:date?zip=<zip>
 *
 * Decodes a zip-encoded journal entry from the query string, validates the date,
 * creates the entry (for today/future) or prepares for backdate confirmation
 * (for past dates), then redirects. If no zip parameter is present, redirects to /journal.
 *
 * Flow:
 * 1. If no zip → redirect to /journal
 * 2. useJournalZipProcessor decodes and checks the date
 * 3. If past date → shows BackdateConfirmModal and waits for confirmation
 * 4. If today/future → auto-creates and redirects
 * 5. If error → shows error state
 */

import { useNavigate } from 'react-router-dom';
import { useJournalZipProcessor } from '../hooks/useJournalZipProcessor';
import { BackdateConfirmModal } from '../components/BackdateConfirmModal';
import { ROUTE_PATTERNS } from '../lib/routes';

export function LoadJournalZipPage() {
  const navigate = useNavigate();
  const processorState = useJournalZipProcessor();

  // Handle modal confirmation
  const handleConfirmBackdate = async () => {
    if (processorState.onConfirmBackdate) {
      await processorState.onConfirmBackdate();
    }
  };

  // Handle modal cancellation
  const handleCancelBackdate = () => {
    navigate(ROUTE_PATTERNS.journal, { replace: true });
  };

  return (
    <>
      {/* Backdate confirmation modal */}
      {processorState.state === 'pending-confirmation' && (
        <BackdateConfirmModal
          dateKey={processorState.dateKey || ''}
          isOpen={true}
          isLoading={false}
          onConfirm={handleConfirmBackdate}
          onCancel={handleCancelBackdate}
        />
      )}

      {/* Loading state */}
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    </>
  );
}
