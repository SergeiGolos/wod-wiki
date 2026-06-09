import type { IFilePicker } from './IFilePicker';

export class BrowserFilePicker implements IFilePicker {
  pick(accept: string = '*'): Promise<File | null> {
    const { promise, resolve } = Promise.withResolvers<File | null>();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
    return promise;
  }
}
