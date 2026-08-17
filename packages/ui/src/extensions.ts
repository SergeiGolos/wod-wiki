/**
 * @wod-wiki/ui/extensions
 * CodeMirror extensions, linter, autocomplete, and editorPreset.
 */

export interface EditorPresetOptions {
  dialect?: string;
  readOnly?: boolean;
}

export function editorPreset(options: EditorPresetOptions = {}): Record<string, unknown> {
  return {
    dialect: options.dialect || 'wod',
    readOnly: options.readOnly ?? false,
    extensions: [],
  };
}
