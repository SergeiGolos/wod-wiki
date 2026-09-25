import { describe, expect, it } from 'bun:test';
import { LocalStore, InMemoryBackend } from './LocalStore';

describe('LocalStore', () => {
  it('qualifies keys with prefix', () => {
    const store = new LocalStore('wodwiki:');
    expect(store.qualify('notebooks')).toBe('wodwiki:notebooks');
  });

  it('stores and retrieves JSON values using InMemoryBackend', () => {
    const backend = new InMemoryBackend();
    const store = new LocalStore('test:', backend);

    store.set('user', { name: 'Alice', age: 30 });
    expect(store.get<{ name: string; age: number }>('user')).toEqual({ name: 'Alice', age: 30 });
    expect(backend.getItem('test:user')).toBe('{"name":"Alice","age":30}');
  });

  it('returns fallback on missing or invalid JSON', () => {
    const backend = new InMemoryBackend();
    const store = new LocalStore('', backend);

    expect(store.get('missing', { fallback: 'default' })).toBe('default');

    backend.setItem('bad-json', '{not:json}');
    expect(store.get('bad-json', { fallback: { ok: false } })).toEqual({ ok: false });
  });

  it('resolves alias key when primary key is not found', () => {
    const backend = new InMemoryBackend();
    const store = new LocalStore('prefix:', backend);

    store.set('old-key', { count: 42 });
    expect(store.get<{ count: number }>('new-key', { alias: 'old-key' })).toEqual({ count: 42 });

    // Primary key wins when present
    store.set('new-key', { count: 99 });
    expect(store.get<{ count: number }>('new-key', { alias: 'old-key' })).toEqual({ count: 99 });
  });

  it('removes both primary key and alias on remove', () => {
    const backend = new InMemoryBackend();
    const store = new LocalStore('prefix:', backend);

    store.set('main', 'foo');
    store.set('alias', 'bar');
    expect(backend.getItem('prefix:main')).not.toBeNull();
    expect(backend.getItem('prefix:alias')).not.toBeNull();

    store.remove('main', 'alias');
    expect(backend.getItem('prefix:main')).toBeNull();
    expect(backend.getItem('prefix:alias')).toBeNull();
  });

  it('supports raw string get/set and setRaw(null) deletion', () => {
    const backend = new InMemoryBackend();
    const store = new LocalStore('raw:', backend);

    store.setRaw('token', 'xyz-123');
    expect(store.getRaw('token')).toBe('xyz-123');

    store.setRaw('token', null);
    expect(store.getRaw('token')).toBeNull();
  });
});
