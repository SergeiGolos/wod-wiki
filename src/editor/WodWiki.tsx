import { useEffect, useState, useMemo } from 'react';
import { CodeMirrorEditor } from '../components/Editor/CodeMirrorEditor';
import type { IScript } from '../parser/WodScript';
import { MdTimerRuntime } from '../parser/md-timer';
import type { CodeMetadata } from '../core/models/CodeMetadata';
import type { ExerciseDataProvider } from '@/core/types/providers';
import { ExerciseIndexManager } from './ExerciseIndexManager';

export interface WodWikiProps {
  id: string;
  code?: string;
  cursor?: CodeMetadata | undefined;  
  /** Optional value change handler */
  onValueChange?: (classObject?: IScript) => void;
  /** Optional callback when editor is mounted - NOTE: Now receives EditorView if needed, but keeping interface for compatibility */
  onMount?: (editor: any) => void;
  /** Whether the editor is read-only */
  readonly?: boolean;
  /** Line number to highlight */
  highlightedLine?: number;
  /** Optional callback when a line is clicked */
  onLineClick?: (lineNumber: number) => void;
  /** Optional exercise data provider for suggestions and hover */
  exerciseProvider?: ExerciseDataProvider;
  /** Editor theme */
  theme?: string;
}

export const WodWiki = ({ id, code = "", cursor = undefined, onValueChange, onMount, readonly = false, highlightedLine, onLineClick, exerciseProvider, theme = "vs" }: WodWikiProps) => {        
    const [content, setContent] = useState(code);
    const parser = useMemo(() => new MdTimerRuntime(), []);

    // Configure exercise provider when it changes
    useEffect(() => {
      if (exerciseProvider) {
        const manager = ExerciseIndexManager.getInstance();
        manager.setProvider(exerciseProvider);
      }
    }, [exerciseProvider]);

    const handleValueChange = (newContent: string) => {
        setContent(newContent);
        if (onValueChange) {
            const script = parser.read(newContent);
            onValueChange(script);
        }
    };

    return (
      <div data-highlighted-line={highlightedLine} className="wodwiki-container border rounded overflow-hidden">
        <CodeMirrorEditor
          value={content}
          onChange={handleValueChange}
          readonly={readonly}
          theme={theme}
          onCursorPositionChange={(line) => {
              if (onLineClick) onLineClick(line);
          }}
        />
      </div>
    );
};
