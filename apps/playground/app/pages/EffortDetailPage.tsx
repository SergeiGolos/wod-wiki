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
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { v7 as uuidv7 } from 'uuid';
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
import type { ScriptBlock } from '@/components/Editor/types';
import type { WorkoutResult } from '@/types/storage';
import { useEffortContent } from '../hooks/useEffortContent';
import { useNotePageNav } from './shared/useNotePageNav';
import { useScriptBlockCommands } from '../hooks/useScriptBlockCommands';
import { useEffortRegistry } from '../contexts/EffortRegistryContext';
import { EffortResolver, type IEffort, type ResolvedEffort } from '@bitcobblers/wod-wiki-lang';
import { effortsPath, parseEffortRouteOptions } from '../lib/routes';
import { toast } from '@/hooks/use-toast';
import { TEST_IDS } from '@/testing/contracts/TestIdContract';
import { shareBlock } from '../services/openInPlayground';
import { createJournalNoteFromWorkout } from '../services/journalWorkout';
import { CalendarCard } from '@/components/atoms/CalendarCard';
import { EditorDialog } from '@bitcobblers/wod-wiki-ui';
import { effortToDocument, documentToEffort } from '@/repositories/effort-markdown';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { ResponsiveActions } from '../nav/ResponsiveActions';

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const actualTheme = theme === 'dark' ? 'dark' : 'vs';
  const { registry, isReady, refresh } = useEffortRegistry();

  const {
    document,
    setDocument,
    isLoading,
    effort,
    isEditable,
    cloneForEdit,
    error,
  } = useEffortContent(slug);

  const [scriptBlocks, setScriptBlocks] = useState<ScriptBlock[]>([]);
  const [results] = useState<WorkoutResult[]>([]);
  const [pendingScheduleBlock, setPendingScheduleBlock] = useState<ScriptBlock | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  // ── Create-custom mode ("/effort/new?mode=create") ───────────────────────
  const opts = parseEffortRouteOptions(searchParams);
  const isCreateMode = slug === 'new' && opts.mode === 'create';
  const [createDocument, setCreateDocument] = useState(() => {
    const blank: IEffort = {
      id: `effort-user-${crypto.randomUUID()}`,
      slug: '',
      label: '',
      aliases: [],
      baseAttributes: { met: 5.0 },
      registrySource: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return effortToDocument(blank);
  });

  const handleCreateSubmit = useCallback(async () => {
    if (!isReady || !registry) return;
    const { effort: parsed, errors } = documentToEffort(createDocument);
    if (errors.length > 0) {
      toast({
        title: 'Invalid YAML',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }
    if (!parsed.slug.trim()) {
      toast({
        title: 'Missing slug',
        description: 'A unique slug is required.',
        variant: 'destructive',
      });
      return;
    }

    parsed.slug = parsed.slug.trim().toLowerCase().replace(/\s+/g, '-');
    parsed.label = parsed.label.trim() || parsed.slug;
    parsed.updatedAt = new Date().toISOString();

    try {
      await registry.upsert(parsed);
      await indexedDBService.saveEffort(parsed);
      await refresh();
      navigate(`/effort/${parsed.slug}`, { replace: true });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Failed to save effort.',
        variant: 'destructive',
      });
    }
  }, [createDocument, isReady, registry, refresh, navigate]);

  // Resolve effort for the inline "resolved" widget
  const resolver = useMemo(() => new EffortResolver(registry), [registry]);
  const resolved = useMemo((): ResolvedEffort | null => {
    if (!effort || !isReady) return null;
    return resolver.resolveEffort(effort.slug);
  }, [effort, isReady, resolver]);

  // ── WOD block handlers ───────────────────────────────────────────────────
  const handleStartWorkout = useCallback((block: ScriptBlock) => {
    const runtimeId = uuidv7();
    // Store in runtime store and navigate
    import('../runtimeStore').then(({ pendingRuntimes }) => {
      pendingRuntimes.set(runtimeId, { block, noteId: `effort/${slug}` });
      navigate(`/run/${runtimeId}`);
    });
  }, [slug, navigate]);

  const handleScheduleBlock = useCallback(async (block: ScriptBlock, date: Date) => {
    if (!effort) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;
    try {
      await createJournalNoteFromWorkout({
        workoutName: effort.label,
        category: 'effort',
        sourceNoteLabel: effort.label,
        sourceNotePath: `/effort/${effort.slug}`,
        wodContent: block.content,
        date,
      });
      navigate(`/journal?s=${dateKey}`);
      toast({
        title: 'Scheduled',
        description: `Added to journal for ${dateKey}`,
      });
    } catch {
      toast({ title: 'Error', description: 'Could not schedule workout', variant: 'destructive' });
    }
  }, [effort]);

  // ── L3 nav from document content ─────────────────────────────────────────
  useNotePageNav({
    content: document,
    scriptBlocks,
    onStartWorkout: handleStartWorkout,
    results,
  });

  // ── WOD block commands ───────────────────────────────────────────────────
  const commands = useScriptBlockCommands('collection-readonly', {
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
        description: `Created a custom copy of "${effort?.label ?? cloned.label}". You can now edit it.`,
      });
    }
  }, [cloneForEdit]);

  // ── Loading / error states ───────────────────────────────────────────────
  if (!isReady) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  if (isCreateMode) {
    // Reserved slug collision: a real effort literally named "new" collides with
    // this create-form route. The form mints a fresh id/slug on save, so the
    // only collision is the URL path itself (unavoidable for any hard-coded
    // create alias).
    return (
      <div className="px-6 lg:px-10 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(effortsPath())} title="Back to catalog">
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Create Custom Effort</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Edit the YAML frontmatter and body, then create.
        </p>
        <textarea
          className="w-full h-96 p-4 font-mono text-sm border rounded-md bg-background"
          value={createDocument}
          onChange={(e) => setCreateDocument(e.target.value)}
          aria-label="Effort document"
        />
        <div className="mt-4 flex gap-2">
          <Button onClick={handleCreateSubmit}>
            Create Effort
          </Button>
          <Button variant="outline" onClick={() => navigate(effortsPath())}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || error || !effort) {
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
    <ResponsiveActions primary={!isEditable ? (
      <Button variant="outline" onClick={handleClone} data-testid={TEST_IDS.EFFORT_DETAIL_CLONE_BTN}>
        <DocumentDuplicateIcon className="size-4 mr-1.5" />
        Clone
      </Button>
    ) : undefined}>
      <Button variant="ghost" size="icon" onClick={() => navigate(effortsPath())} aria-label="Back to catalog">
        <ArrowLeftIcon className="size-4" />
      </Button>
      <Badge
        data-testid={TEST_IDS.EFFORT_DETAIL_SOURCE}
        variant={effort.registrySource === 'bundled' ? 'secondary' : 'default'}
      >
        {effort.registrySource === 'bundled' ? 'Bundled' : 'Custom'}
      </Badge>
      {resolved && (
        <Button
          variant={showResolved ? 'default' : 'outline'}
          onClick={() => setShowResolved(v => !v)}
        >
          <Eye className="size-4 mr-1.5" />
          {showResolved ? 'Hide Resolved' : 'Show Resolved'}
        </Button>
      )}
    </ResponsiveActions>
  );

  const noteId = `effort/${effort.slug}`;


  return (
    <div data-testid={TEST_IDS.EFFORT_DETAIL_ROOT} className="contents">
      <JournalPageShell
        title={effort.label}
        titleTestId={TEST_IDS.EFFORT_DETAIL_LABEL}
        actions={pageActions}
        editor={
          <div className="relative" data-testid={TEST_IDS.EFFORT_DETAIL_NOTEBOOK_EDITOR}>
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
              onBlocksChange={setScriptBlocks}
            />
          </div>
        }
      />

      {/* Schedule modal */}
      {pendingScheduleBlock && (
        <EditorDialog
          open
          onClose={() => setPendingScheduleBlock(null)}
          title="Schedule workout"
        >
            <CalendarCard
              selectedDate={null}
              onDateSelect={(date) => {
                handleScheduleBlock(pendingScheduleBlock, date);
                setPendingScheduleBlock(null);
              }}
            />
        </EditorDialog>
      )}
    </div>
  );
}
