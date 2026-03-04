import { Attachment } from '../../types/storage';

export interface AttachmentMetadata {
  label: string;
  mimeType: string;
  timeSpan?: {
    start: number;
    end: number;
  };
  data: ArrayBuffer | string;
}

export interface IAttachmentStrategy {
  /**
   * Name of the strategy for debugging.
   */
  name: string;

  /**
   * Whether this strategy can process the given file.
   */
  canProcess(file: File): Promise<boolean>;

  /**
   * Processes the file and returns attachment metadata.
   */
  process(file: File): Promise<AttachmentMetadata>;
}
