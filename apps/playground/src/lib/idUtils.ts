/**
 * ID Utilities
 * 
 * Helper functions for handling UUIDs and Short IDs.
 * Short IDs are defined as the last segment of a UUID (after the last dash).
 */

export function toShortId(uuid: string | null | undefined): string {
    if (!uuid) return '';
    const parts = uuid.split('-');
    return parts.length > 1 ? parts[parts.length - 1] : uuid;
}

export function isUuid(id: string): boolean {
    // Basic regex for UUID format (8-4-4-4-12)
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function resolveId<T extends { id: string }>(items: T[], idOrShortId: string): T | undefined {
    // 1. Precise match
    const exact = items.find(i => i.id === idOrShortId);
    if (exact) return exact;

    // 2. Suffix match (short ID)
    // Only if candidate is structured like a UUID
    return items.find(i => i.id.endsWith('-' + idOrShortId));
}

export function matchesId(fullId: string, queryId: string): boolean {
    if (fullId === queryId) return true;
    if (fullId.endsWith('-' + queryId) && queryId.length < fullId.length) return true;
    return false;
}
