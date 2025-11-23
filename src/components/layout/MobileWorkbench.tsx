import React, { useState, useMemo, useEffect } from 'react';
import { WodWorkbenchProps } from './WodWorkbench';
import { WodIndexPanel } from './WodIndexPanel';
import { ContextPanel } from '../../markdown-editor/components/ContextPanel';
import { RuntimeLayout } from '../../views/runtime/RuntimeLayout';
import { parseDocumentStructure, DocumentItem } from '../../markdown-editor/utils/documentStructure';
import { WodBlock } from '../../markdown-editor/types';
import { Button } from '@/components/ui/button';
import { Plus, Search, ArrowLeft, Edit3 } from 'lucide-react';
import { useCommandPalette } from '../../components/command-palette/CommandContext';
import { CommandPalette } from '../../components/command-palette/CommandPalette';
import { FragmentType } from '../../core/models/CodeFragment';

type MobileScreen = 'index' | 'detail' | 'track' | 'analyze' | 'editor';

export const MobileWorkbench: React.FC<WodWorkbenchProps> = ({
  initialContent = "# My Workout\n\n```wod\nTimer: 10:00\n  - 10 Pushups\n  - 10 Situps\n```\n",
  ...props
}) => {
  const [content, setContent] = useState(initialContent);
  const [blocks, setBlocks] = useState<WodBlock[]>([]); 
  
  const [activeScreen, setActiveScreen] = useState<MobileScreen>('index');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const { setIsOpen } = useCommandPalette();

  // Parse content into blocks (Simulation for MobileWorkbench)
  useEffect(() => {
    const newBlocks: WodBlock[] = [];
    const lines = content.split('\n');
    let inBlock = false;
    let startLine = -1;
    let blockContent: string[] = [];

    lines.forEach((line, index) => {
      if (line.trim().startsWith('```wod')) {
        inBlock = true;
        startLine = index;
        blockContent = []; 
      } else if (line.trim().startsWith('```') && inBlock) {
        inBlock = false;
        const endLine = index;
        // Create block
        newBlocks.push({
            id: `block-${startLine}`,
            content: blockContent.join('\n'),
            startLine: startLine,
            endLine: endLine,
            state: 'parsed',
            statements: [], // Mock statements
            errors: [],
            widgetIds: {}
        });
      } else if (inBlock) {
        blockContent.push(line);
      }
    });

    // If we have blocks, populate them with mock statements so they are runnable
    const runnableBlocks = newBlocks.map(b => ({
        ...b,
        statements: [
            { 
                id: 1, 
                children: [],
                fragments: [
                    { type: 'text', image: 'Timer: ', fragmentType: FragmentType.Text },
                    { type: 'timer', image: '10:00', value: { duration: 600 }, fragmentType: FragmentType.Timer }
                ],
                meta: { line: b.startLine + 1, startOffset: 0, endOffset: 12, columnStart: 0, columnEnd: 12, length: 12 }
            },
            { 
                id: 2, 
                children: [],
                fragments: [
                    { type: 'text', image: '  - ', fragmentType: FragmentType.Text },
                    { type: 'rep', image: '10', value: { count: 10 }, fragmentType: FragmentType.Rep },
                    { type: 'text', image: ' Pushups', fragmentType: FragmentType.Text }
                ],
                meta: { line: b.startLine + 2, startOffset: 0, endOffset: 15, columnStart: 0, columnEnd: 15, length: 15 }
            },
            { 
                id: 3, 
                children: [],
                fragments: [
                    { type: 'text', image: '  - ', fragmentType: FragmentType.Text },
                    { type: 'rep', image: '10', value: { count: 10 }, fragmentType: FragmentType.Rep },
                    { type: 'text', image: ' Situps', fragmentType: FragmentType.Text }
                ],
                meta: { line: b.startLine + 3, startOffset: 0, endOffset: 14, columnStart: 0, columnEnd: 14, length: 14 }
            }
        ] as any
    }));

    setBlocks(runnableBlocks);
  }, [content]);

  const documentItems = useMemo(() => {
    return parseDocumentStructure(content, blocks);
  }, [content, blocks]);

  // Find the active block object
  const activeBlock = useMemo(() => {
    return blocks.find(b => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  const handleBlockClick = (item: DocumentItem) => {
    if (item.type === 'wod') {
      setSelectedBlockId(item.id);
      setActiveScreen('detail');
    }
  };

  const handleBack = () => {
    if (activeScreen === 'detail') setActiveScreen('index');
    else if (activeScreen === 'track') setActiveScreen('detail');
    else if (activeScreen === 'analyze') setActiveScreen('index');
    else setActiveScreen('index');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="h-14 border-b border-border flex items-center px-4 justify-between bg-background z-10">
        <div className="flex items-center gap-3">
          {activeScreen !== 'index' && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="-ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-bold text-lg truncate max-w-[200px]">
            {activeScreen === 'index' && 'Workouts'}
            {activeScreen === 'detail' && (activeBlock ? 'Workout Details' : 'Details')}
            {activeScreen === 'track' && 'Tracking'}
            {activeScreen === 'analyze' && 'Analysis'}
          </h1>
        </div>
        <div className="flex gap-2">
           {/* Command Palette Trigger */}
           <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
             <Search className="h-5 w-5" />
           </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeScreen === 'index' && (
          <WodIndexPanel 
            items={documentItems}
            onBlockClick={handleBlockClick}
            onBlockHover={() => {}}
            mobile={true}
          />
        )}

        {activeScreen === 'detail' && activeBlock && (
          <ContextPanel 
            block={activeBlock}
            mobile={true}
            onTrack={() => setActiveScreen('track')}
            readonly={true} // Detail view is read-only for now
          />
        )}

        {(activeScreen === 'track' || activeScreen === 'analyze') && (
          <RuntimeLayout 
            activeBlock={activeBlock}
            documentItems={documentItems} // Not used in stacked mode but required by prop
            onBlockClick={() => {}}
            onComplete={() => setActiveScreen('analyze')}
            onBack={handleBack}
            viewMode={activeScreen === 'track' ? 'run' : 'analyze'}
            layoutMode="stacked"
          />
        )}
        
        {/* Fallback for missing block */}
        {activeScreen === 'detail' && !activeBlock && (
           <div className="p-8 text-center text-muted-foreground">
             <p>Block not found or not parsed yet.</p>
             <Button variant="outline" className="mt-4" onClick={() => setActiveScreen('index')}>
               Back to Index
             </Button>
           </div>
        )}
      </div>

      {/* Floating Action Button (Index only) */}
      {activeScreen === 'index' && (
        <div className="absolute bottom-6 right-6">
          <Button 
            size="icon" 
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setIsOpen(true)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}
      
      <CommandPalette />
    </div>
  );
};
