/**
 * IFileWriter — port for writing files to an archive or filesystem.
 */
export interface IFileWriter {
  /** Add a text file to the archive. */
  addText(name: string, content: string): void;
  /** Generate the archive as a Blob. */
  toBlob(): Promise<Blob>;
}
