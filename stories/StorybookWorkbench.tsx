import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CommandProvider, useCommandPalette } from '../src/components/command-palette/CommandContext';
import { WorkbenchProvider, useWorkbench } from '../src/components/layout/WorkbenchContext';
import { RuntimeLifecycleProvider } from '../src/components/layout/RuntimeLifecycleProvider';
import { WorkbenchSyncBridge } from '../src/components/layout/WorkbenchSyncBridge';
import { DisplaySyncBridge } from '../src/components/layout/DisplaySyncBridge';
import { WorkbenchCastBridge } from '../src/components/cast/WorkbenchCastBridge';
import { useWorkbenchSync } from '../src/components/layout/useWorkbenchSync';
import { DebugButton, useDebugMode } from '../src/components/layout/DebugModeContext';
import { CastButtonRpc } from '../src/components/cast/CastButtonRpc';
import { RuntimeFactory } from '../src/runtime/compiler/RuntimeFactory';
import { globalCompiler } from '../src/runtime-test-bench/services/testbench-services';
import { 
  FileText, 
  Activity, 
  BarChart3, 
  Download, 
  RotateCcw, 
  Edit, 
  Timer, 
  BarChart2, 
  Upload, 
  Trash2, 
  File,
  Home,
  Search,
  Settings,
  HelpCircle,
  Tv,
  MoreVertical,
  Bug,
  RefreshCw
} from 'lucide-react';
import { Button } from '../src/components/ui/button';
import { Badge } from '../src/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../src/components/ui/dropdown-menu';
import { cn } from '../src/lib/utils';

import { UnifiedEditor } from '../src/components/Editor/UnifiedEditor';
import { WorkbenchProps } from '../src/components/layout/Workbench';
import { useWorkbenchSyncStore } from '../src/components/layout/workbenchSyncStore';
import { useInMemoryNavigation } from '../src/hooks/useInMemoryNavigation';

// Catalyst-like components for Storybook (moved to src/components/playground)
import { SidebarLayout } from '../src/components/playground/sidebar-layout';
import { Sidebar, SidebarBody, SidebarHeader, SidebarHeading, SidebarItem, SidebarLabel, SidebarSection, SidebarSpacer } from '../src/components/playground/sidebar';
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '../src/components/playground/navbar';
import { Avatar } from '../src/components/playground/avatar';
import { Dropdown, DropdownButton, DropdownDivider, DropdownItem, DropdownLabel, DropdownMenu as CatalystDropdownMenu } from '../src/components/playground/dropdown';

const runtimeFactory = new RuntimeFactory(globalCompiler);

// --- ?z support (same as before) ---
function extractAndStripZ(): string | null {
  let params = new URLSearchParams(window.location.search);
  if (!params.has('z')) {
    try {
      const parentParams = new URLSearchParams(window.parent.location.search);
      if (parentParams.has('z')) params = parentParams;
    } catch { }
  }
  return params.get('z');
}

let _rawZ: string | null = extractAndStripZ();

async function decodeZParam(z: string): Promise<string> {
  const binary = atob(z.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  try {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();
    writer.write(bytes);
    writer.close();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLen = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Uint8Array(totalLen);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.length; }
    return new TextDecoder().decode(merged);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

function useZParamContent(): { content: string | undefined; ready: boolean } {
  const [content, setContent] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(!_rawZ);
  useEffect(() => {
    const z = _rawZ;
    _rawZ = null;
    if (!z) return;
    decodeZParam(z).then(decoded => setContent(decoded)).finally(() => setReady(true));
  }, []);
  return { content, ready };
}

interface StorybookWorkbenchProps extends WorkbenchProps {
  initialContent?: string;
}

const StorybookWorkbenchContent: React.FC<StorybookWorkbenchProps> = ({
  initialContent,
}) => {
  const {
    content,
    setContent,
    activeBlockId,
    setActiveBlockId,
    selectBlock,
    resetResults,
    addAttachment,
    attachments,
    deleteAttachment,
  } = useWorkbench();

  const { setIsOpen } = useCommandPalette();
  const { isDebugMode } = useDebugMode();
  const resetStore = useWorkbenchSyncStore(s => s.resetStore);
  const { handleStartWorkoutAction, execution } = useWorkbenchSync();

  const handleReset = useCallback(() => {
    resetStore();
    if (execution.status !== 'idle') execution.reset();
    selectBlock(null);
    setActiveBlockId(null);
    resetResults();
    window.location.reload();
  }, [resetStore, execution, selectBlock, setActiveBlockId, resetResults]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <div className="flex items-center gap-3 lg:hidden truncate">
            <span className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
              Storybook Workbench
            </span>
          </div>
          <NavbarSpacer />
          <NavbarSection>
            <NavbarItem onClick={() => setIsOpen(true)} aria-label="Search">
              <Search className="size-5" />
            </NavbarItem>
            <NavbarItem className="lg:hidden">
              <Tv className="size-5" />
            </NavbarItem>
            <div className="lg:hidden">
              <Dropdown>
                <DropdownButton plain>
                  <MoreVertical className="size-5" />
                </DropdownButton>
                <CatalystDropdownMenu className="min-w-48" anchor="bottom end">
                  <DropdownItem onClick={handleDownload}>
                    <Download className="size-4" />
                    <DropdownLabel>Download</DropdownLabel>
                  </DropdownItem>
                  <DropdownItem onClick={handleReset}>
                    <RefreshCw className="size-4 text-red-500" />
                    <DropdownLabel className="text-red-500">Reset</DropdownLabel>
                  </DropdownItem>
                </CatalystDropdownMenu>
              </Dropdown>
            </div>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center px-2 py-2.5">
              <Avatar initials="SB" className="bg-pink-600 text-white size-6" />
              <span className="ml-3 text-sm font-semibold text-zinc-950 dark:text-white">Storybook</span>
            </div>
            <SidebarSection>
              <SidebarItem href="#" current>
                <Home className="size-5" />
                <SidebarLabel>Workbench</SidebarLabel>
              </SidebarItem>
              <SidebarItem onClick={() => setIsOpen(true)}>
                <Search className="size-5" />
                <SidebarLabel>Search</SidebarLabel>
                <kbd className="ml-auto hidden font-sans text-xs text-zinc-400 lg:inline">⌘K</kbd>
              </SidebarItem>
            </SidebarSection>
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              <SidebarHeading>Actions</SidebarHeading>
              <SidebarItem onClick={handleDownload}>
                <Download className="size-5" />
                <SidebarLabel>Export Markdown</SidebarLabel>
              </SidebarItem>
              <SidebarItem onClick={handleReset}>
                <RotateCcw className="size-5 text-red-500" />
                <SidebarLabel className="text-red-500">Reset Data</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
            <SidebarSpacer />
            <SidebarSection>
              <SidebarHeading>Environment</SidebarHeading>
              <div className="px-2">
                <DebugButton />
              </div>
              <div className="px-2 mt-2">
                <CastButtonRpc />
              </div>
            </SidebarSection>
          </SidebarBody>
        </Sidebar>
      }
    >
      <div className="flex flex-col h-full min-h-[calc(100vh-theme(spacing.20))]">
        <div className="sticky top-0 z-30 bg-white lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950 pt-4 lg:pt-6 max-lg:hidden">
          <div className="flex items-center justify-between px-6 lg:px-10">
            <h1 className="text-2xl/8 font-semibold text-zinc-950 sm:text-xl/8 dark:text-white">Workbench</h1>
            <div className="flex items-center gap-4">
              <CastButtonRpc />
              <DebugButton />
              <Button variant="ghost" size="icon" onClick={handleDownload}>
                <Download className="size-5" />
              </Button>
            </div>
          </div>
          <hr role="presentation" className="mt-6 w-full border-t border-zinc-950/10 dark:border-white/10" />
        </div>
        
        <div className="flex-1 flex flex-col min-h-0">
          <UnifiedEditor
            value={content}
            onChange={setContent}
            onStartWorkout={handleStartWorkoutAction}
            className="flex-1 min-h-0 w-full"
            theme="vs-dark" // Should ideally sync with storybook theme
          />
        </div>
      </div>
    </SidebarLayout>
  );
};

export const StorybookWorkbench: React.FC<StorybookWorkbenchProps> = (props) => {
  const { content: zContent, ready } = useZParamContent();
  const navigation = useInMemoryNavigation({
    view: 'plan',
    noteId: 'static',
  });

  if (!ready) return null;

  const effectiveContent = zContent ?? props.initialContent ?? '';

  return (
      <CommandProvider>
        <WorkbenchProvider
          initialContent={effectiveContent}
          mode="static"
          navigation={navigation}
        >
          <RuntimeLifecycleProvider factory={runtimeFactory}>
            <WorkbenchSyncBridge>
              <WorkbenchCastBridge />
              <DisplaySyncBridge />
              <StorybookWorkbenchContent {...props} />
            </WorkbenchSyncBridge>
          </RuntimeLifecycleProvider>
        </WorkbenchProvider>
      </CommandProvider>
  );
};
