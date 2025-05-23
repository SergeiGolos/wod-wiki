import React, { useState, useEffect, useRef } from 'react';
import { WikiContainer } from '@/components/WikiContainer';
import { WorkoutEntry } from './WorkbookStorage';

interface WorkbookPageProps {
  workout: WorkoutEntry;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
}

export const WorkbookPage: React.FC<WorkbookPageProps> = ({
  workout,
  onTitleChange,
  onContentChange
}) => {
  const [title, setTitle] = useState(workout.title);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Update title when workout changes
  useEffect(() => {
    setTitle(workout.title);
  }, [workout.id, workout.title]);

  // Auto-resize title textarea and prevent multi-line input
  useEffect(() => {
    if (titleRef.current) {
      // Reset height to auto to get accurate scrollHeight
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, [title]);

  // Handle title input change
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Prevent newlines in title
    const newTitle = e.target.value.replace(/\n/g, '');
    setTitle(newTitle);
    onTitleChange(newTitle);
  };

  // Handle keydown in title to prevent Enter key
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      {/* Title editor */}
      <div className="px-4 py-2 border-b border-gray-200">
        <textarea
          ref={titleRef}
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          className="w-full resize-none overflow-hidden text-2xl font-bold border-0 focus:ring-0 focus:outline-none bg-transparent"
          placeholder="Workout Title"
          rows={1}
        />
      </div>

      {/* Workout editor */}
      <div className="flex-grow overflow-auto">
        <WikiContainer
          id={workout.id}
          code={workout.content}
          className="m-4 border-gray-300"
          onScriptCompiled={() => {
            // Save content when compiled
            const editorContent = (document.querySelector(`[data-path="${workout.id}"]`) as HTMLElement)?.innerText;
            if (editorContent && editorContent !== workout.content) {
              onContentChange(editorContent);
            }
          }}
        />
      </div>
    </div>
  );
};