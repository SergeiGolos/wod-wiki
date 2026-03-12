/**
 * FilePreviewEmbed
 * 
 * Renders a file preview for uploaded/referenced files in front matter.
 * Supports image previews (jpg, png, gif, webp, svg) and generic file cards.
 */

import React from 'react';
import { SECTION_LINE_HEIGHT } from '../../SectionContainer';
import { FileImage, File, FileText, FileVideo } from 'lucide-react';

export interface FilePreviewEmbedProps {
  properties: Record<string, string>;
  lineCount: number;
}

/** Determine file type from extension */
function fileCategory(path: string): 'image' | 'video' | 'text' | 'generic' {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
  if (['txt', 'md', 'csv', 'json', 'yaml', 'yml'].includes(ext)) return 'text';
  return 'generic';
}

const FILE_ICONS = {
  image: FileImage,
  video: FileVideo,
  text: FileText,
  generic: File,
};

export const FilePreviewEmbed: React.FC<FilePreviewEmbedProps> = ({ properties, lineCount }) => {
  const filePath = properties['file'] || properties['path'] || properties['src'] || '';
  const title = properties['title'] || properties['name'] || filePath.split('/').pop() || 'File';
  const alt = properties['alt'] || title;

  const minHeight = lineCount * SECTION_LINE_HEIGHT;
  const category = fileCategory(filePath);
  const IconComponent = FILE_ICONS[category];

  if (!filePath) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground italic bg-muted/30 rounded"
        style={{ minHeight }}
      >
        No file path specified
      </div>
    );
  }

  return (
    <div className="py-1" style={{ minHeight }}>
      <div className="rounded border border-border/40 bg-card overflow-hidden">
        {category === 'image' ? (
          /* Image preview */
          <div className="relative">
            <img
              src={filePath}
              alt={alt}
              className="max-w-full max-h-64 object-contain mx-auto bg-muted/20"
              loading="lazy"
            />
          </div>
        ) : (
          /* Generic file card */
          <div className="flex items-center gap-3 px-4 py-3">
            <IconComponent className="w-8 h-8 text-muted-foreground/60 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{title}</div>
              <div className="text-xs text-muted-foreground truncate">{filePath}</div>
            </div>
          </div>
        )}

        {/* Caption */}
        {properties['caption'] && (
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-t border-border/20 italic">
            {properties['caption']}
          </div>
        )}
      </div>
    </div>
  );
};
