import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/atoms/primitives/button';
import { cn } from '@/lib/utils';
import { CommitGraph } from '@/components/organisms/CommitGraph';
import { NotebookMenu } from '@/components/organisms/notebook/NotebookMenu';
import { DebugButton } from '@/contexts/DebugModeContext';
import { CastButtonRpc } from '@/components/organisms/cast/CastButtonRpc';
import { SaveStateIndicator, type SaveState } from '@/components/molecules/SaveStateIndicator';
import { SearchTrigger } from '@/components/molecules/SearchTrigger';
import { ViewModeTabs, type ViewModeTab } from '@/components/molecules/ViewModeTabs';
import { AttachmentsDropdown } from '@/components/molecules/AttachmentsDropdown';
import type { Attachment } from '@/types/storage';
import type { HistoryEntry } from '@/types/history';

export interface WorkbenchHeaderProps {
  appVersion: string;
  isMobile: boolean;
  currentEntry: HistoryEntry | null;
  saveState: SaveState;
  onSearch?: () => void;
  viewMode: string;
  views: ViewModeTab[];
  onViewChange: (id: string) => void;
  attachments: Attachment[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadAttachment: (att: Attachment) => void;
  onDeleteAttachment: (id: string) => void;
  currentEntryTags: string[];
  onNotebookToggle: (notebookId: string, isAdding: boolean) => void;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
  onStartTutorial: (viewMode: string) => void;
}

export const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  appVersion,
  isMobile,
  currentEntry,
  saveState,
  onSearch,
  viewMode,
  views,
  onViewChange,
  attachments,
  fileInputRef,
  onFileSelect,
  onDownloadAttachment,
  onDeleteAttachment,
  currentEntryTags,
  onNotebookToggle,
  isDetailsOpen,
  onToggleDetails,
  onStartTutorial,
}) => {
  const navigate = useNavigate();

  return (
    <div
      id="tutorial-header"
      className="h-14 bg-background border-b border-border flex items-center px-4 justify-between shrink-0 z-10"
    >
      <div className="font-bold flex items-center gap-4">
        <div
          className={cn(
            'h-10 flex items-center cursor-pointer hover:opacity-80 transition-opacity',
            isMobile ? 'w-[150px]' : 'w-[300px]'
          )}
          onClick={() => navigate('/')}
        >
          <CommitGraph
            text={isMobile ? 'WOD.WIKI' : 'WOD.WIKI++'}
            rows={16}
            cols={isMobile ? 60 : 90}
            gap={1}
            padding={0}
            fontScale={0.8}
            fontWeight={200}
            letterSpacing={1.6}
          />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/50 self-end mb-1">
          v{appVersion}
        </span>
        {!isMobile && currentEntry && (
          <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded text-muted-foreground">
            {new Date(currentEntry.targetDate).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>

      <div className="flex gap-2 items-center">
        {!isMobile && <SaveStateIndicator state={saveState} />}
        <SearchTrigger onSearch={onSearch} isMobile={isMobile} />

        {!isMobile && <div className="h-6 w-px bg-border mx-2" />}

        <DebugButton />

        <CastButtonRpc />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onStartTutorial(viewMode)}
          className="text-muted-foreground hover:text-foreground"
          title="Show Help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>

        {!isMobile && <div className="h-6 w-px bg-border mx-2" />}

        <ViewModeTabs
          views={views}
          activeView={viewMode}
          onChange={onViewChange}
          isMobile={isMobile}
        />

        <AttachmentsDropdown
          attachments={attachments}
          fileInputRef={fileInputRef}
          onFileSelect={onFileSelect}
          onDownload={onDownloadAttachment}
          onDelete={onDeleteAttachment}
        />

        <NotebookMenu
          entryTags={currentEntryTags}
          onEntryToggle={onNotebookToggle}
          iconOnly={true}
        />

        <div className="h-6 w-px bg-border mx-2" />

        <button
          id="tutorial-details"
          onClick={onToggleDetails}
          className={cn(
            'p-2 rounded-md transition-colors',
            isDetailsOpen
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          title="Toggle Note Details"
        >
          <PanelRightOpen className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
