/**
 * IFileDownloader — port for triggering a browser download.
 */
export interface IFileDownloader {
  download(blob: Blob, filename: string): void;
}
