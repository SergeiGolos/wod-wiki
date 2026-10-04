import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  sectionField,
  frontmatterPreview,
} from '../src/extensions';

const SAMPLE_NOTE = `---
tags:
  - domain-model
store: field_catalog
keyPath: id
db: wodwiki-db (v20)
---

# FieldCatalogEntry
Some note body here.
`;

describe('frontmatterPreview extension', () => {
  it('renders properties box with tag pills, list icons, and add property button', () => {
    const state = EditorState.create({
      doc: SAMPLE_NOTE,
      extensions: [sectionField, frontmatterPreview],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });

    const previewEl = container.querySelector('.cm-frontmatter-preview');
    expect(previewEl).not.toBeNull();

    // "Properties" header
    expect(previewEl?.textContent).toContain('Properties');

    // Tags pill
    expect(previewEl?.textContent).toContain('domain-model');

    // Scalar values
    const inputs = previewEl?.querySelectorAll('input');
    const inputValues = Array.from(inputs ?? []).map((i) => (i as HTMLInputElement).value);

    // Key inputs
    expect(inputValues).toContain('tags');
    expect(inputValues).toContain('store');
    expect(inputValues).toContain('keyPath');
    expect(inputValues).toContain('db');

    // Value inputs
    expect(inputValues).toContain('field_catalog');
    expect(inputValues).toContain('id');
    expect(inputValues).toContain('wodwiki-db (v20)');

    // Add property button
    expect(previewEl?.textContent).toContain('Add property');

    view.destroy();
    container.remove();
  });

  it('allows removing a tag via its pill remove button', () => {
    const state = EditorState.create({
      doc: SAMPLE_NOTE,
      extensions: [sectionField, frontmatterPreview],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });

    const removeTagBtn = container.querySelector('button[aria-label="Remove tag domain-model"]') as HTMLButtonElement;
    expect(removeTagBtn).not.toBeNull();

    removeTagBtn.click();

    expect(view.state.doc.toString()).not.toContain('domain-model');
    expect(view.state.doc.toString()).toContain('store: field_catalog');

    view.destroy();
    container.remove();
  });

  it('allows adding a new tag via tag input', () => {
    const state = EditorState.create({
      doc: SAMPLE_NOTE,
      extensions: [sectionField, frontmatterPreview],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });

    const tagInput = container.querySelector('input[placeholder*="Add tag"]') as HTMLInputElement;
    expect(tagInput).not.toBeNull();

    tagInput.value = 'architecture';
    tagInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(view.state.doc.toString()).toContain('architecture');
    expect(view.state.doc.toString()).toContain('domain-model');

    view.destroy();
    container.remove();
  });

  it('allows editing a property value input', () => {
    const state = EditorState.create({
      doc: SAMPLE_NOTE,
      extensions: [sectionField, frontmatterPreview],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });

    const storeInput = Array.from(container.querySelectorAll('input')).find(
      (i) => (i as HTMLInputElement).value === 'field_catalog',
    ) as HTMLInputElement;
    expect(storeInput).not.toBeNull();

    storeInput.value = 'custom_catalog';
    storeInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(view.state.doc.toString()).toContain('store: custom_catalog');

    view.destroy();
    container.remove();
  });

  it('allows adding a new property via Add property button', () => {
    const state = EditorState.create({
      doc: SAMPLE_NOTE,
      extensions: [sectionField, frontmatterPreview],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });

    const addBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add property'),
    );
    expect(addBtn).toBeDefined();

    addBtn?.click();

    expect(view.state.doc.toString()).toContain('property:');

    view.destroy();
    container.remove();
  });

  it('allows removing a property via row remove button', () => {
    const state = EditorState.create({
      doc: SAMPLE_NOTE,
      extensions: [sectionField, frontmatterPreview],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });

    const delKeyPathBtn = container.querySelector('button[aria-label="Remove property keyPath"]') as HTMLButtonElement;
    expect(delKeyPathBtn).not.toBeNull();

    delKeyPathBtn.click();

    expect(view.state.doc.toString()).not.toContain('keyPath:');
    expect(view.state.doc.toString()).toContain('store: field_catalog');

    view.destroy();
    container.remove();
  });

  it('renders read-only mode without editable inputs or action buttons', () => {
    const state = EditorState.create({
      doc: SAMPLE_NOTE,
      extensions: [sectionField, frontmatterPreview, EditorState.readOnly.of(true)],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });

    const previewEl = container.querySelector('.cm-frontmatter-preview');
    expect(previewEl?.querySelectorAll('input').length).toBe(0);
    expect(previewEl?.querySelectorAll('button').length).toBe(0);
    expect(previewEl?.textContent).toContain('domain-model');
    expect(previewEl?.textContent).toContain('field_catalog');

    view.destroy();
    container.remove();
  });

  it('renders +tag along with +property when no tags property is in frontmatter', () => {
    const NOTE_NO_TAGS = `---
title: My Workout
author: Coach
---
# Workout body
`;
    const state = EditorState.create({
      doc: NOTE_NO_TAGS,
      extensions: [sectionField, frontmatterPreview],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });

    const addPropBtn = container.querySelector('button[aria-label="Add property"]');
    const addTagBtn = container.querySelector('button[aria-label="Add tag"]');

    expect(addPropBtn).not.toBeNull();
    expect(addTagBtn).not.toBeNull();

    view.destroy();
    container.remove();
  });

  it.each(['tags', 'tag', 'Category'])('Add tag focuses the existing %s input without changing metadata', (key) => {
    const state = EditorState.create({
      doc: `---\n${key}: [parkour]\n---\nBody`,
      extensions: [sectionField, frontmatterPreview],
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });
    const before = view.state.doc.toString();
    const addTagBtn = container.querySelector('button[aria-label="Add tag"]');
    if (!(addTagBtn instanceof HTMLButtonElement)) throw new Error('Missing Add tag action');
    addTagBtn.click();
    expect(document.activeElement?.getAttribute('aria-label')).toBe(`Add tag to ${key}`);
    expect(view.state.doc.toString()).toBe(before);
    view.destroy();
    container.remove();
  });

  it('allows adding tags property via Add tag button when tags property is missing', () => {
    const NOTE_NO_TAGS = `---
title: My Workout
---
# Body
`;
    const state = EditorState.create({
      doc: NOTE_NO_TAGS,
      extensions: [sectionField, frontmatterPreview],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });

    const addTagBtn = container.querySelector('button[aria-label="Add tag"]') as HTMLButtonElement;
    expect(addTagBtn).not.toBeNull();
    addTagBtn.click();

    expect(view.state.doc.toString()).toContain('tags:');

    view.destroy();
    container.remove();
  });

  it('renders +tag along with +properties at the top when editing a note with no frontmatter', () => {
    const NOTE_WITHOUT_FM = `# Just A Heading
No frontmatter here.
`;
    const state = EditorState.create({
      doc: NOTE_WITHOUT_FM,
      extensions: [sectionField, frontmatterPreview],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });

    const addPropBtn = container.querySelector('button[aria-label="Add property"]');
    const addTagBtn = container.querySelector('button[aria-label="Add tag"]');

    expect(addPropBtn).not.toBeNull();
    expect(addTagBtn).not.toBeNull();

    (addTagBtn as HTMLButtonElement).click();

    expect(view.state.doc.toString()).toMatch(/^---\r?\ntags:/);

    view.destroy();
    container.remove();
  });

  it('does not render metadata buttons for notes without frontmatter in read-only mode', () => {
    const NOTE_WITHOUT_FM = `# Readonly Heading
No frontmatter.
`;
    const state = EditorState.create({
      doc: NOTE_WITHOUT_FM,
      extensions: [sectionField, frontmatterPreview, EditorState.readOnly.of(true)],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView({ state, parent: container });

    const previewEl = container.querySelector('.cm-frontmatter-preview');
    expect(previewEl).toBeNull();

    view.destroy();
    container.remove();
  });
});
