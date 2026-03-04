import { IAttachmentStrategy, AttachmentMetadata } from './IAttachmentStrategy';

export class GpxAttachmentStrategy implements IAttachmentStrategy {
  name = 'GPX';

  async canProcess(file: File): Promise<boolean> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension === 'gpx' || file.type === 'application/gpx+xml';
  }

  async process(file: File): Promise<AttachmentMetadata> {
    const content = await file.text();
    let timeSpan;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'application/xml');

      const times = Array.from(doc.querySelectorAll('time'))
        .map(t => new Date(t.textContent || '').getTime())
        .filter(t => !isNaN(t))
        .sort((a, b) => a - b);

      if (times.length > 0) {
        timeSpan = {
          start: times[0],
          end: times[times.length - 1],
        };
      }
    } catch (e) {
      console.warn('[GpxAttachmentStrategy] Failed to parse GPX content for metadata');
    }

    return {
      label: file.name,
      mimeType: 'application/gpx+xml',
      timeSpan,
      data: content, // For GPX, store as string
    };
  }
}

export const gpxAttachmentStrategy = new GpxAttachmentStrategy();
