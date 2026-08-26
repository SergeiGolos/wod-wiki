import { describe, it, expect, vi } from 'vitest';
import { FileProcessor } from '../FileProcessor';
import { IAttachmentStrategy } from '../IAttachmentStrategy';

describe('FileProcessor', () => {
  it('should use the first strategy that can process the file', async () => {
    const mockFile = new File(['test'], 'test.gpx', { type: 'application/gpx+xml' });
    
    const strategy1: IAttachmentStrategy = {
      name: 'Strategy 1',
      canProcess: async () => false,
      process: vi.fn(),
    };

    const strategy2: IAttachmentStrategy = {
      name: 'Strategy 2',
      canProcess: async () => true,
      process: async () => ({
        label: 'processed',
        mimeType: 'text/plain',
        data: new ArrayBuffer(0),
      }),
    };

    const processor = new FileProcessor([strategy1, strategy2]);
    const result = await processor.process(mockFile);

    expect(result.label).toBe('processed');
    expect(strategy1.process).not.toHaveBeenCalled();
  });
});
