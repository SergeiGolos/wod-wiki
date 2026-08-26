import { IAttachmentStrategy, AttachmentMetadata } from './IAttachmentStrategy';

export class JsonAttachmentStrategy implements IAttachmentStrategy {
  name = 'JSON';

  async canProcess(file: File): Promise<boolean> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension === 'json' || file.type === 'application/json';
  }

  async process(file: File): Promise<AttachmentMetadata> {
    const content = await file.text();
    let label = file.name;
    let timeSpan;

    try {
      const parsed = JSON.parse(content);
      
      // Try to find a label or name in the JSON
      if (parsed.label || parsed.name || parsed.title) {
        label = parsed.label || parsed.name || parsed.title;
      }

      // Try to find timestamps
      if (parsed.startTime && parsed.endTime) {
        timeSpan = {
          start: new Date(parsed.startTime).getTime(),
          end: new Date(parsed.endTime).getTime(),
        };
      } else if (parsed.timestamp) {
        const t = new Date(parsed.timestamp).getTime();
        timeSpan = { start: t, end: t };
      }
    } catch (e) {
      console.warn('[JsonAttachmentStrategy] Failed to parse JSON content for metadata');
    }

    return {
      label,
      mimeType: 'application/json',
      timeSpan,
      data: content,
    };
  }
}

export const jsonAttachmentStrategy = new JsonAttachmentStrategy();
