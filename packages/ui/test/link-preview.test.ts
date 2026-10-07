import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { sectionField, linkPreview, markdownTablePreview } from '../src/extensions';

function mount(doc: string, readOnly = false): { view: EditorView; container: HTMLElement } {
  const state = EditorState.create({
    doc,
    extensions: [sectionField, linkPreview, EditorState.readOnly.of(readOnly)],
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = new EditorView({ state, parent: container });
  return { view, container };
}

describe('linkPreview extension', () => {
  it('renders markdown links and bare URLs as pills with a new-tab button', () => {
    const doc = 'See [the docs](https://example.com/docs) and https://foo.bar/baz for details.\nDone.\n';
    const { view, container } = mount(doc);
    // Move the cursor off the link line so pills render.
    view.dispatch({ selection: { anchor: doc.length } });

    const pills = container.querySelectorAll('.cm-link-pill');
    expect(pills.length).toBe(2);

    const opens = container.querySelectorAll('a.cm-link-pill-open');
    expect(opens.length).toBe(2);
    expect((opens[0] as HTMLAnchorElement).href).toBe('https://example.com/docs');
    expect((opens[0] as HTMLAnchorElement).target).toBe('_blank');
    expect((opens[0] as HTMLAnchorElement).rel).toContain('noopener');
    expect((opens[1] as HTMLAnchorElement).href).toBe('https://foo.bar/baz');
    expect(container.querySelector('.cm-link-pill-label')?.textContent).toBe('the docs');

    view.destroy();
    container.remove();
  });

  it('strips trailing punctuation from bare URLs', () => {
    const doc = 'Visit https://example.com/page.\nDone.\n';
    const { view, container } = mount(doc);
    view.dispatch({ selection: { anchor: doc.length } });
    const open = container.querySelector('a.cm-link-pill-open') as HTMLAnchorElement;
    expect(open).not.toBeNull();
    expect(open.href).toBe('https://example.com/page');
    expect(open.getAttribute('href')).toBe('https://example.com/page');
    view.destroy();
    container.remove();
  });

  it('leaves the raw link text on the cursor line while editing', () => {
    const doc = 'See [the docs](https://example.com/docs) here.\n';
    const { view, container } = mount(doc);
    // Move the cursor onto the link line.
    view.dispatch({ selection: { anchor: 10 } });

    expect(container.querySelector('.cm-link-pill')).toBeNull();
    expect(container.textContent).toContain('[the docs](https://example.com/docs)');

    view.destroy();
    container.remove();
  });

  it('shows a YouTube player for embed links in read mode and a pill in edit mode', () => {
    const doc = '[Demo](https://youtu.be/dQw4w9WgXcQ)\n';

    const read = mount(doc, true);
    expect(read.container.querySelector('.cm-youtube-player iframe')).not.toBeNull();
    expect(read.container.querySelector('.cm-youtube-player iframe')?.getAttribute('src'))
      .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(read.container.querySelector('.cm-link-pill')).toBeNull();
    read.view.destroy();
    read.container.remove();

    // Edit mode: cursor is on line 1 (pos 0), so raw text shows; move off the line.
    const edit = mount(`${doc}More text.\n`);
    edit.view.dispatch({ selection: { anchor: edit.view.state.doc.length } });
    const pill = edit.container.querySelector('.cm-link-pill');
    expect(pill).not.toBeNull();
    expect(edit.container.querySelector('.cm-youtube-player')).toBeNull();
    edit.view.destroy();
    edit.container.remove();
  });

  it('renders non-YouTube embed links as pills in read mode', () => {
    const { view, container } = mount('[Docs](https://example.com/docs)\n', true);
    expect(container.querySelector('.cm-link-pill')).not.toBeNull();
    expect(container.querySelector('.cm-youtube-player')).toBeNull();
    view.destroy();
    container.remove();
  });

  it('does not touch URLs inside code spans', () => {
    const doc = 'Use `https://example.com/raw` inline.\nDone.\n';
    const { view, container } = mount(doc);
    view.dispatch({ selection: { anchor: doc.length } });
    expect(container.querySelector('.cm-link-pill')).toBeNull();
    view.destroy();
    container.remove();
  });
});

describe('markdownTablePreview extension', () => {
  it('renders pipe tables as HTML tables outside the cursor', () => {
    const doc = '| Exercise | Reps |\n| --- | --- |\n| Squat | 5 |\n| Press | 3 |\n\nDone.\n';
    const state = EditorState.create({
      doc,
      extensions: [sectionField, markdownTablePreview],
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });
    view.dispatch({ selection: { anchor: doc.length } });

    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(table?.querySelectorAll('th').length).toBe(2);
    expect(table?.textContent).toContain('Squat');
    expect(container.textContent).not.toContain('| --- |');
    // Surrounding prose outside the table lines survives.
    expect(container.textContent).toContain('Done.');

    view.destroy();
    container.remove();
  });

  it('keeps the raw source while the cursor is inside the table', () => {
    const doc = '| Exercise | Reps |\n| --- | --- |\n| Squat | 5 |\n\nDone.\n';
    const state = EditorState.create({
      doc,
      extensions: [sectionField, markdownTablePreview],
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });
    // Cursor on the separator line (inside the table).
    view.dispatch({ selection: { anchor: doc.indexOf('---') } });

    expect(container.querySelector('table')).toBeNull();
    expect(container.textContent).toContain('| --- |');

    view.destroy();
    container.remove();
  });

  it('renders tables that follow prose in the same section', () => {
    const doc = 'Warm-up sets:\n\n| Exercise | Reps |\n| --- | --- |\n| Squat | 5 |\n';
    const state = EditorState.create({
      doc,
      extensions: [sectionField, markdownTablePreview],
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });
    view.dispatch({ selection: { anchor: 2 } }); // cursor on prose line, outside the table

    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(table?.textContent).toContain('Squat');
    expect(container.textContent).toContain('Warm-up sets:');

    view.destroy();
    container.remove();
  });
});
