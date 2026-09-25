import { describe, expect, it, beforeEach } from 'bun:test';
import { NotebookService } from './NotebookService';
import { LocalStore, InMemoryBackend } from './storage/LocalStore';

describe('NotebookService', () => {
  let backend: InMemoryBackend;
  let service: NotebookService;

  beforeEach(() => {
    backend = new InMemoryBackend();
    service = new NotebookService(new LocalStore('wodwiki:', backend));
  });

  it('starts with no notebooks', () => {
    expect(service.getAll()).toEqual([]);
    expect(service.getActiveId()).toBeNull();
  });

  it('creates and retrieves notebooks', () => {
    const nb = service.create('CrossFit WODs', 'Daily training logs', '🏋️');
    expect(nb.name).toBe('CrossFit WODs');
    expect(nb.description).toBe('Daily training logs');
    expect(nb.icon).toBe('🏋️');
    expect(nb.id).toBeDefined();

    const all = service.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(nb.id);

    const fetched = service.getById(nb.id);
    expect(fetched?.name).toBe('CrossFit WODs');
  });

  it('updates an existing notebook', () => {
    const nb = service.create('Old Name');
    const updated = service.update(nb.id, { name: 'New Name', icon: '🔥' });
    expect(updated.name).toBe('New Name');
    expect(updated.icon).toBe('🔥');

    expect(service.getById(nb.id)?.name).toBe('New Name');
  });

  it('deletes a notebook and clears active ID if deleted was active', () => {
    const nb1 = service.create('Notebook 1');
    const nb2 = service.create('Notebook 2');
    service.setActiveId(nb1.id);

    expect(service.getActiveId()).toBe(nb1.id);
    service.delete(nb1.id);

    expect(service.getAll()).toHaveLength(1);
    expect(service.getAll()[0].id).toBe(nb2.id);
    expect(service.getActiveId()).toBeNull();
  });

  it('ensureDefault creates default notebook when empty', () => {
    const activeId = service.ensureDefault();
    const all = service.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('My Workouts');
    expect(activeId).toBe(all[0].id);
    expect(service.getActiveId()).toBe(all[0].id);
  });

  it('ensureDefault reuses existing active notebook', () => {
    const nb1 = service.create('Existing');
    service.setActiveId(nb1.id);

    const activeId = service.ensureDefault();
    expect(activeId).toBe(nb1.id);
    expect(service.getAll()).toHaveLength(1);
  });
});
