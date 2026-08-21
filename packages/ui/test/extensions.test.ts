import { describe, expect, it  } from 'vitest';
import { EditorState } from '@codemirror/state';
import {
  editorPreset,
  sectionField,
  sectionGeometry,
  linkOpen,
  navigationFacet,
  editorTheme,
} from '../src/extensions';
import { EditorView } from '@codemirror/view';

describe('@bitcobblers/wod-wiki-ui/extensions and editorPreset suite', () => {
  it('editorPreset(dialect) returns a functional extension array', () => {
    const preset = editorPreset('markdown');
    expect(Array.isArray(preset)).toBe(true);
    expect(preset.length).toBeGreaterThan(5);

    const state = EditorState.create({
      doc: '# Header\n\n```time\n10:00 Run\n```\n',
      extensions: preset,
    });

    const sections = state.field(sectionField).sections;
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(sections.some((s) => s.type === 'time')).toBe(true);
  });

  it('editorPreset("wql") configures WQL language support', () => {
    const preset = editorPreset('wql');
    const state = EditorState.create({
      doc: 'sum:totalVolume{effort:bench-press} every week',
      extensions: preset,
    });
    expect(state.doc.toString()).toContain('sum:totalVolume');
  });

  it('navigationFacet provides custom navigation hook for linkOpen extension', () => {
    let navigatedUrl = '';
    const state = EditorState.create({
      doc: '[workout](wod:note-1)',
      extensions: [
        linkOpen,
        navigationFacet.of((url) => {
          navigatedUrl = url;
        }),
      ],
    });

    const hook = state.facet(navigationFacet);
    expect(hook).toBeDefined();
    if (hook) {
      hook('wod:note-1', {} as any);
      expect(navigatedUrl).toBe('wod:note-1');
    }
  });

  it('editorTheme generates extension for light and dark modes', () => {
    const darkTheme = editorTheme(true);
    const lightTheme = editorTheme(false);
    expect(darkTheme).toBeDefined();
    expect(lightTheme).toBeDefined();
  });

  it('sectionGeometry computes non-zero document-space top for later sections', () => {
    const state = EditorState.create({
      doc: '# Header\n\n```time\n10:00 Run\n```\n',
      extensions: [sectionField, sectionGeometry],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });

    const plugin = view.plugin(sectionGeometry);
    expect(plugin).toBeDefined();
    expect(plugin?.rects.length).toBeGreaterThanOrEqual(2);

    const timeRect = plugin?.rects.find((r) => r.type === 'time');
    expect(timeRect).toBeDefined();
    expect(timeRect?.top).toBeGreaterThan(0);

    view.destroy();
    container.remove();
  });
});
