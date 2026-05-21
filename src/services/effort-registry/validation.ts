import type { EffortRecord } from './types';
import { slugifyEffort } from './normalization';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertValidEffortRecord(value: unknown, context = 'effort'): asserts value is EffortRecord {
  if (!isPlainObject(value)) {
    throw new TypeError(`${context} must be an object`);
  }

  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    throw new TypeError(`${context}.id must be a non-empty string`);
  }

  if (typeof value.slug !== 'string' || value.slug.trim().length === 0) {
    throw new TypeError(`${context}.slug must be a non-empty string`);
  }

  if (slugifyEffort(value.slug) !== value.slug) {
    throw new TypeError(`${context}.slug must already be normalized`);
  }

  if (typeof value.label !== 'string' || value.label.trim().length === 0) {
    throw new TypeError(`${context}.label must be a non-empty string`);
  }

  if (!Array.isArray(value.aliases) || value.aliases.some(alias => typeof alias !== 'string' || alias.trim().length === 0)) {
    throw new TypeError(`${context}.aliases must be an array of non-empty strings`);
  }

  if (typeof value.discipline !== 'string' || value.discipline.trim().length === 0) {
    throw new TypeError(`${context}.discipline must be a non-empty string`);
  }

  if (typeof value.modality !== 'string' || value.modality.trim().length === 0) {
    throw new TypeError(`${context}.modality must be a non-empty string`);
  }

  if (!isPlainObject(value.baseAttributes)) {
    throw new TypeError(`${context}.baseAttributes must be an object`);
  }

  if (typeof value.visibility !== 'string' || value.visibility.trim().length === 0) {
    throw new TypeError(`${context}.visibility must be set`);
  }

  if (typeof value.registrySource !== 'string' || value.registrySource.trim().length === 0) {
    throw new TypeError(`${context}.registrySource must be set`);
  }

  if (typeof value.createdAt !== 'string' || value.createdAt.trim().length === 0) {
    throw new TypeError(`${context}.createdAt must be an ISO timestamp string`);
  }

  if (typeof value.updatedAt !== 'string' || value.updatedAt.trim().length === 0) {
    throw new TypeError(`${context}.updatedAt must be an ISO timestamp string`);
  }
}

export function assertValidEffortBatch(efforts: readonly EffortRecord[], context = 'efforts'): void {
  const slugs = new Set<string>();

  efforts.forEach((effort, index) => {
    assertValidEffortRecord(effort, `${context}[${index}]`);
    if (slugs.has(effort.slug)) {
      throw new TypeError(`${context} contains duplicate slug '${effort.slug}'`);
    }
    slugs.add(effort.slug);
  });
}
