/**
 * IFilePicker — port for picking files from the user's device.
 */
export interface IFilePicker {
  pick(accept?: string): Promise<File | null>;
}
