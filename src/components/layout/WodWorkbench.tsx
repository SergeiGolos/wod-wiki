import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MarkdownEditorBase, MarkdownEditorProps } from '../../markdown-editor/MarkdownEditor';
import { WodBlock } from '../../markdown-editor/types';
import { CommandProvider } from '../../components/command-palette/CommandContext';
import { CommandPalette } from '../../components/command-palette/CommandPalette';
import { ContextPanel } from '../../markdown-editor/components/ContextPanel';
import { useBlockEditor } from '../../markdown-editor/hooks/useBlockEditor';
import { editor as monacoEditor } from 'monaco-editor';
import { Play, Edit, BarChart2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { ThemeToggle } from '../theme/ThemeToggle';
import { WodIndexPanel } from './WodIndexPanel';
import { parseDocumentStructure, DocumentItem } from '../../markdown-editor/utils/documentStructure';
import { MetricsProvider } from '../../services/MetricsContext';
import { RuntimeLayout } from '../../views/runtime/RuntimeLayout';

export interface WodWorkbenchProps extends Omit<MarkdownEditorProps, 'onMount' | 'onBlocksChange' | 'onActiveBlockChange' | 'onCursorPositionChange' | 'highlightedLine'> {
  initialContent?: string;
}

const WodWorkbenchContent: React.FC<WodWorkbenchProps> = ({
  initialContent = "# My Workout\n\n```wod\nTimer: 10:00\n  - 10 Pushups\n  - 10 Situps\n```\n",
  theme: propTheme,
  ...editorProps
}) => {
  const { theme, setTheme } = useTheme();
  const [activeBlock, setActiveBlock] = useState<WodBlock | null>(null);
  const [blocks, setBlocks] = useState<WodBlock[]>([]);
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  const [content, setContent] = useState(initialContent);
  const [cursorLine, setCursorLine] = useState(1);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  
  // View Mode State
  const [viewMode, setViewMode] = useState<'edit' | 'run' | 'analyze'>('edit');
  
  // Selected block for Right Panel (distinct from activeBlock which tracks cursor)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Calculate document structure for index panel
  const documentItems = useMemo(() => {
    return parseDocumentStructure(content, blocks);
  }, [content, blocks]);

  // Determine active block ID based on cursor line
  const activeBlockId = useMemo(() => {
    const item = documentItems.find(item => 
      cursorLine >= item.startLine && cursorLine <= item.endLine
    );
    return item?.id;
  }, [documentItems, cursorLine]);

  // Sync selected block with active block when cursor moves into a block
  useEffect(() => {
    if (viewMode === 'edit') {
      setSelectedBlockId(activeBlockId || null);
    }
  }, [activeBlockId, viewMode]);

  // Handle Escape key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedBlockId(null);
        // Optional: Clear active block in editor too if needed, but usually we just want to clear the right panel focus
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync prop theme to context theme (for Storybook controls)
  useEffect(() => {
    if (!propTheme) return;
    
    const targetTheme = (propTheme === 'vs-dark' || propTheme === 'wod-dark') ? 'dark' : 'light';
    // Only update if we're not in system mode and the theme is different
    if (theme !== 'system' && theme !== targetTheme) {
      setTheme(targetTheme);
    }
  }, [propTheme]);

  // Compute Monaco theme reactively based on global theme
  const monacoTheme = useMemo(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    let computedTheme: string;
    
    if (theme === 'system') {
      computedTheme = mediaQuery.matches ? 'vs-dark' : 'vs';
    } else {
      computedTheme = theme === 'dark' ? 'vs-dark' : 'vs';
    }
    
    console.log('[WodWorkbench] Theme computed - global:', theme, '→ monaco:', computedTheme);
    return computedTheme;
  }, [theme]);

  // Block editor hooks
  const { addStatement, editStatement, deleteStatement } = useBlockEditor({
    editor: editorInstance,
    block: activeBlock
  });

  // Handle editor mount
  const handleEditorMount = (editor: monacoEditor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);
  };
  
  // Handle navigation from index panel
  const handleBlockClick = (item: DocumentItem) => {
    // Set selected block if it's a WOD block
    if (item.type === 'wod') {
      setSelectedBlockId(item.id);
    }

    // Only scroll editor if we are in edit mode
    if (viewMode === 'edit' && editorInstance) {
      const line = item.startLine + 1; // Monaco is 1-indexed, item is 0-indexed
      editorInstance.revealLineInCenter(line);
      editorInstance.setPosition({ lineNumber: line, column: 1 });
      editorInstance.focus();
      
      // Highlight the line briefly
      setHighlightedLine(line);
      setTimeout(() => setHighlightedLine(null), 2000);
    }
  };

  // Handlers
  const handleTrack = () => {
    setViewMode('run');
  };

  const handleComplete = () => {
    setViewMode('analyze');
  };

  const handleBackToEdit = () => {
    setViewMode('edit');
  };

  const handleClearSelection = () => {
    setSelectedBlockId(null);
    // If we are in run or analyze mode, clearing selection should just show the index in the left panel
    // but we stay in the current view mode.
  };

  // Find the selected block object
  const selectedBlock = useMemo(() => {
    return blocks.find(b => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  return (
    <CommandProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
        {/* Header / Navigation */}
        <div className="h-14 bg-background border-b border-border flex items-center px-4 justify-between shrink-0 z-10">
          <div className="font-bold flex items-center gap-4">
            <div className="flex items-center">
              <img
                src="/images/wod-wiki-logo-light.png"
                alt="WOD Wiki"
                className="h-8 block dark:hidden"
              />
              <img
                src="/images/wod-wiki-logo-dark.png"
                alt="WOD Wiki"
                className="h-8 hidden dark:block"
              />
            </div>
            <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded text-muted-foreground">
              {viewMode.toUpperCase()} MODE
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <ThemeToggle />
            <div className="h-6 w-px bg-border mx-2"></div>
            
            <Button
              variant={viewMode === 'edit' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('edit')}
              className={`gap-2 ${viewMode === 'edit' ? '' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant={viewMode === 'run' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('run')}
              className={`gap-2 ${viewMode === 'run' ? '' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Play className="h-4 w-4" />
              Track
            </Button>
            <Button
              variant={viewMode === 'analyze' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('analyze')}
              className={`gap-2 ${viewMode === 'analyze' ? '' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <BarChart2 className="h-4 w-4" />
              Analyze
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden flex">
          
          {/* Panel 1: Editor (Left 2/3 in Edit Mode) */}
          <div
            className={`h-full border-r border-border transition-all duration-500 ease-in-out ${viewMode === 'edit'
                ? 'w-2/3 opacity-100'
                : 'w-0 opacity-0 overflow-hidden border-none'
              }`}
          >
            <div ref={editorContainerRef} className="h-full w-full">
              <MarkdownEditorBase
                initialContent={initialContent}
                showContextOverlay={false}
                onActiveBlockChange={setActiveBlock}
                onBlocksChange={setBlocks}
                onContentChange={setContent}
                onCursorPositionChange={(line) => setCursorLine(line)}
                highlightedLine={highlightedLine}
                onMount={handleEditorMount}
                height="100%"
                {...editorProps}
                theme={monacoTheme}
              />
            </div>
          </div>

          {/* Panel 2: Right Panel (Index or Staging) (Right 1/3 in Edit Mode) */}
          <div
            className={`h-full border-r border-border transition-all duration-500 ease-in-out ${viewMode === 'edit' ? 'w-1/3 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
              }`}
          >
            {selectedBlock ? (
              <div className="h-full flex flex-col">
                <div className="p-2 border-b border-border flex items-center">
                  <Button variant="ghost" size="sm" onClick={handleClearSelection} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Index
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ContextPanel
                    block={selectedBlock}
                    onAddStatement={addStatement}
                    onEditStatement={editStatement}
                    onDeleteStatement={deleteStatement}
                    onTrack={handleTrack}
                  />
                </div>
              </div>
            ) : (
              <WodIndexPanel 
                items={documentItems}
                activeBlockId={activeBlockId}
                onBlockClick={handleBlockClick}
                onBlockHover={() => {}}
              />
            )}
          </div>

          {/* Panel 3: Runtime (Visible in Run or Analyze Mode) */}
          <div
            className={`h-full border-r border-border transition-all duration-500 ease-in-out ${viewMode === 'run' || viewMode === 'analyze' ? 'w-full opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
              }`}
          >
            <RuntimeLayout 
              activeBlock={selectedBlock} 
              documentItems={documentItems}
              onBlockClick={handleBlockClick}
              onComplete={handleComplete} 
              onBack={handleClearSelection}
              viewMode={viewMode === 'analyze' ? 'analyze' : 'run'}
            />
          </div>

        </div>
      </div>
      <CommandPalette />
    </CommandProvider>
  );
};

export const WodWorkbench: React.FC<WodWorkbenchProps> = (props) => {
  // Determine default theme based on props
  const defaultTheme = useMemo(() => {
    if (props.theme === 'vs-dark' || props.theme === 'wod-dark') return 'dark';
    if (props.theme === 'vs' || props.theme === 'wod-light') return 'light';
    return 'dark';
  }, [props.theme]);

  return (
    <ThemeProvider defaultTheme={defaultTheme} storageKey="wod-wiki-theme">
      <MetricsProvider>
        <WodWorkbenchContent {...props} />
      </MetricsProvider>
    </ThemeProvider>
  );
};
