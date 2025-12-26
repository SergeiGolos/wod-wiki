
import { SpanMetadata } from '../models/RuntimeSpan';

/**
 * Create a SpanMetadata object with default values.
 * Use this when stamping context onto spans at creation time.
 */
export function createSpanMetadata(
    tags: string[] = [],
    context: Record<string, unknown> = {}
): SpanMetadata {
    return {
        tags,
        context,
        logs: []
    };
}
