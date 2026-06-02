import React from 'react';
import { Upload, Trash2, File } from 'lucide-react';
import { Button } from '@/components/atoms/primitives/button';
import { Badge } from '@/components/atoms/primitives/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/atoms/primitives/dropdown-menu';
import type { Attachment } from '@/types/storage';

interface AttachmentsDropdownProps {
  attachments: Attachment[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: (att: Attachment) => void;
  onDelete: (id: string) => void;
}

export const AttachmentsDropdown: React.FC<AttachmentsDropdownProps> = ({
  attachments,
  fileInputRef,
  onFileSelect,
  onDownload,
  onDelete,
}) => {
  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={onFileSelect}
        multiple
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              title="Attachments"
            >
              <Upload className="h-5 w-5" />
            </Button>
            {attachments.length > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px] bg-primary text-primary-foreground pointer-events-none"
              >
                {attachments.length}
              </Badge>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex justify-between items-center">
            <span>Attachments</span>
            <Badge variant="outline">{attachments.length}</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {attachments.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              No attachments found
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              {attachments.map((att) => (
                <DropdownMenuItem
                  key={att.id}
                  className="flex flex-col items-start gap-1 p-2 cursor-default focus:bg-accent"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div
                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:underline"
                      onClick={() => onDownload(att)}
                    >
                      <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">{att.label}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(att.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex w-full justify-between text-[10px] text-muted-foreground px-6">
                    <span>{att.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                    <span>{new Date(att.createdAt).toLocaleDateString()}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="justify-center text-primary font-medium cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload New
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
