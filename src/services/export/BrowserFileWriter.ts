import JSZip from 'jszip';
import type { IFileWriter } from './IFileWriter';

export class BrowserFileWriter implements IFileWriter {
  private zip = new JSZip();

  addText(name: string, content: string): void {
    this.zip.file(name, content);
  }

  async toBlob(): Promise<Blob> {
    return this.zip.generateAsync({ type: 'blob' });
  }
}
