import type { IFileWriter } from './IFileWriter';

export class InMemoryFileWriter implements IFileWriter {
  readonly files = new Map<string, string>();

  addText(name: string, content: string): void {
    this.files.set(name, content);
  }

  async toBlob(): Promise<Blob> {
    // For tests: create a simple text blob with all files concatenated
    const content = Array.from(this.files.entries())
      .map(([name, data]) => `== ${name} ==\n${data}`)
      .join('\n\n');
    return new Blob([content], { type: 'application/zip' });
  }

  getFile(name: string): string | undefined {
    return this.files.get(name);
  }

  hasFile(name: string): boolean {
    return this.files.has(name);
  }
}
