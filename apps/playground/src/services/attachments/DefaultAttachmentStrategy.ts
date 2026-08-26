import { IAttachmentStrategy, AttachmentMetadata } from './IAttachmentStrategy';

export class DefaultAttachmentStrategy implements IAttachmentStrategy {
  name = 'Default';

  async canProcess(_file: File): Promise<boolean> {
    return true; // Fallback strategy
  }

  async process(file: File): Promise<AttachmentMetadata> {
    const data = await file.arrayBuffer();
    return {
      label: file.name,
      mimeType: file.type || 'application/octet-stream',
      data,
    };
  }
}

export const defaultAttachmentStrategy = new DefaultAttachmentStrategy();
