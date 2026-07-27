import React from 'react';

interface NoteMetadataProps {
  title: string;
}

export const NoteMetadata: React.FC<NoteMetadataProps> = ({ title }) => {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">Name</label>
      <div className="text-sm font-medium">{title}</div>
    </div>
  );
};
