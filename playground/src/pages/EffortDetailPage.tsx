/**
 * EffortDetailPage — /effort/:slug
 *
 * Effort as a first-class note page. Uses the standard note format:
 *   - JournalPageShell with L1/L2/L3 navigation
 *   - NoteEditor for live markdown + wodwiki editing
 *   - YAML frontmatter rendered as a table view (via frontmatterPreview extension)
 *   - Real-time persistence: debounced save to IndexedDB + registry
 *   - IDB-first load with markdown file fallback
 *
 * Bundled efforts are read-only until first edit, which auto-clones them.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowLeftIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/20/solid';
import { Eye } from 'lucide-react';
import { Button } from '@/components/atoms/primitives/button';
import { Badge } from '@/components/atoms/primitives/badge';
import { NoteEditor } from '@/components/organisms/editor/NoteEditor';
import { useTheme } from '@/contexts/ThemeProvider';
import { JournalPageShell } from '@/panels/page-shells';
import type { WodBlock } from '@/components/Editor/types';
import type { WorkoutResult } from '@/types/storage';
import { useEffortContent } from '../hooks/useEffortContent';
import { useNotePageNav } from './shared/useNotePageNav';
import { useWodBlockCommands } from '../hooks/useWodBlockCommands';
import { useEffortRegistry } from '../contexts/EffortRegistryContext';
import { EffortResolver } from '@/effort-registry';
import type { IEffort, ResolvedEffort } from '@/effort-registry';
import { effortsPath } from '../lib/routes';
import { toast } from '@/hooks/use-toast';
import { TEST_IDS } from '@/testing/contracts/TestIdContract';
import { shareBlock } from '../services/openInPlayground';
import { appendWorkoutToJournal } from '../services/journalWorkout';
import { CalendarCard } from '@/components/atoms/CalendarCard';

/* ── Resolved view (inline widget) ─────────────────────────────────────────── */

function EffortResolvedInline({ resolved, effort }: { resolved: ResolvedEffort; effort: IEffort }) {
  return (
    <div className="my-6 p-4 border rounded-lg bg-muted/30 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Eye className="size-4" />
        Effective Resolution
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground uppercase">Effective MET</p>
          <p className="text-xl font-bold">{resolved.met.toFixed(1)}</p>
          {Math.abs(resolved.met - (effort.baseAttributes.met || 0)) > 0.01 && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              (base: {effort.baseAttributes.met.toFixed(1)})
            </span>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase">Discipline Factor</p>
          <p className="text-xl font-bold">{resolved.disciplineFactor.toFixed(2)}×</p>
        </div>
      </div>
      {Object.keys(resolved.modifiers).length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground uppercase mb-2">Applied Modifiers</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(resolved.modifiers).map(([key, value]) => (
              <Badge key={key} variant="outline">{key}: {value}</Badge>
            ))}
          </div>
        </div>
      )}
      {resolved.definition.derivation?.parentSlug && (
        <div className="border-t pt-3 text-sm">
          <p className="text-xs text-muted-foreground uppercase mb-1">Parent</p>
          <span className="font-mono text-primary">{resolved.definition.derivation.parentSlug}</span>
        </div>
      )}
    </div>
  );
}

/* ── Main page component ──────────────────────────────────────────────────── */

export function EffortDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const actualTheme = theme === 'dark' ? 'dark' : 'vs';
  const { registry, isReady } = useEffortRegistry();

  const {
    document,
    setDocument,
    isLoading,
    effort,
    isEditable,
    cloneForEdit,
    error,
  } = useEffortContent(slug);

  const [wodBlocks, setWodBlocks] = useState<WodBlock[]>([]);
  const [results] = useState<WorkoutResult[]>([]);
  const [pendingScheduleBlock, setPendingScheduleBlock] = useState<WodBlock | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  // Resolve effort for the inline "resolved" widget
  const resolver = useMemo(() => new EffortResolver(registry), [registry]);
  const resolved = useMemo((): ResolvedEffort | null => {
    if (!effort || !isReady) return null;
    return resolver.resolveEffort(effort.slug);
  }, [effort, isReady, resolver]);

  // ── WOD block handlers ───────────────────────────────────────────────────
  const handleStartWorkout = useCallback((block: WodBlock) => {
    const runtimeId = uuidv4();
    // Store in runtime store and navigate
    import('../runtimeStore').then(({ pendingRuntimes }) => {
      pendingRuntimes.set(runtimeId, { block, noteId: `effort/${slug}` });
      navigate(`/run/${runtimeId}`);
    });
  }, [slug, navigate]);

  const handleScheduleBlock = useCallback(async (block: WodBlock, date: Date) => {
    if (!effort) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;
    try {
      await appendWorkoutToJournal({
        workoutName: effort.label,
        category: 'effort',
        sourceNoteLabel: effort.label,
        sourceNotePath: `/effort/${effort.slug}`,
        wodContent: block.content,
        date,
      });
      toast({
        title: 'Scheduled',
        description: `Added to journal for ${dateKey}`,
      });
    } catch {
      toast({ title: 'Error', description: 'Could not schedule workout', variant: 'destructive' });
    }
  }, [effort]);

  // ── L3 nav from document content ─────────────────────────────────────────
  const index = useNotePageNav({
    content: document,
    wodBlocks,
    onStartWorkout: handleStartWorkout,
    results,
  });

  // ── WOD block commands ───────────────────────────────────────────────────
  const commands = useWodBlockCommands('collection-readonly', {
    onPlay: handleStartWorkout,
    onShare: shareBlock,
    onSchedule: setPendingScheduleBlock,
  });

  // ── Page title ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (effort) {
      window.document.title = `Wod.Wiki - ${effort.label}`;
    }
  }, [effort]);

  // ── Handle clone for edit ────────────────────────────────────────────────
  const handleClone = useCallback(() => {
    const cloned = cloneForEdit();
    if (cloned) {
      toast({
        title: 'Cloned',
        description: `Created a custom copy of "${cloned.label}". You can now edit it.`,
      });
    }
  }, [cloneForEdit]);

  // ── Loading / error states ───────────────────────────────────────────────
  if (!isReady || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  if (error || !effort) {
    return (
      <div data-testid={TEST_IDS.EFFORT_NOT_FOUND} className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-muted-foreground">{error || `Effort "${slug}" not found.`}</p>
        <Button variant="outline" onClick={() => navigate(effortsPath())}>
          Back to Catalog
        </Button>
      </div>
    );
  }

  // ── Actions bar (rendered by JournalPageShell actions prop) ──────────────
  const pageActions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => navigate(effortsPath())} title="Back to catalog">
        <ArrowLeftIcon className="size-4" />
      </Button>
      <Badge variant={effort.registrySource === 'bundled' ? 'secondary' : 'default'}>
        {effort.registrySource === 'bundled' ? 'Bundled' : 'Custom'}
      </Badge>
      {!isEditable && (
        <Button variant="outline" size="sm" onClick={handleClone}>
          <DocumentDuplicateIcon className="size-4 mr-1.5" />
          Clone
        </Button>
      )}
      {resolved && (
        <Button
          variant={showResolved ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowResolved(v => !v)}
        >
          <Eye className="size-4 mr-1.5" />
          {showResolved ? 'Hide Resolved' : 'Show Resolved'}
        </Button>
      )}
    </div>
  );

  const noteId = `effort/${effort.slug}`;

  return (
    <>
      <JournalPageShell
        title={effort.label}
        actions={pageActions}
        index={index}
        editor={
          <div className="relative">
            {/* Resolved view inline widget */}
            {showResolved && resolved && (
              <div className="px-6 lg:px-10 pt-4">
                <EffortResolvedInline resolved={resolved} effort={effort} />
              </div>
            )}
            <NoteEditor
              noteId={noteId}
              value={document}
              onChange={setDocument}
              theme={actualTheme}
              readonly={!isEditable}
              showLineNumbers={true}
              enablePreview={true}
              enableLinting={true}
              mode="edit"
              commands={commands}
              onBlocksChange={setWodBlocks}
              extendedResults={results}
            />
          </div>
        }
      />

      {/* Schedule modal */}
      {pendingScheduleBlock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPendingScheduleBlock(null)}
        >
          <div
            className="bg-card border border-border rounded-xl p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold mb-4 text-foreground">Schedule for&hellip;</p>
            <CalendarCard
              selectedDate={null}
              onDateSelect={(date) => {
                handleScheduleBlock(pendingScheduleBlock, date);
                setPendingScheduleBlock(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
