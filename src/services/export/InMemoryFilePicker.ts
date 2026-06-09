import type { IFilePicker } from './IFilePicker';

export class InMemoryFilePicker implements IFilePicker {
  private file: File | null = null;

  setFile(file: File | null): void {
    this.file = file;
  }

  async pick(_accept?: string): Promise<File | null> {
    return this.file;
  }
}
