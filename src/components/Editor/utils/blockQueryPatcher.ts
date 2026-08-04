/**
 * blockQueryPatcher — utilities to extract and patch WQL queries inside ```query
 * fenced block sources (#842).
 *
 * Supports both plain line queries and structured YAML key-value blocks.
 * Preserves sibling keys, comments, formatting, and quotes when patching.
 */

export interface ExtractedQuery {
  queryIndex: number;
  query: string;
  isYamlKey: boolean;
  lineIndex: number;
}

const YAML_QUERY_LINE_REGEX = /^(\s*query\s*:\s*)(['"]?)(.*?)\2(\s*)$/;

/**
 * Unquote a string if wrapped in matching quotes.
 */
function unquote(val: string): string {
  const trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Extract all WQL queries contained within a block body.
 * Detects YAML `query:` keys first; falls back to non-comment, non-empty lines.
 */
export function extractBlockQueries(blockContent: string): ExtractedQuery[] {
  const lines = blockContent.split('\n');
  const yamlQueries: ExtractedQuery[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(YAML_QUERY_LINE_REGEX);
    if (match) {
      yamlQueries.push({
        queryIndex: yamlQueries.length,
        query: unquote(match[3]),
        isYamlKey: true,
        lineIndex: i,
      });
    }
  }

  if (yamlQueries.length > 0) {
    return yamlQueries;
  }

  // Fallback: line-based queries (stacked queries)
  const lineQueries: ExtractedQuery[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.length > 0 && !trimmed.startsWith('#')) {
      lineQueries.push({
        queryIndex: lineQueries.length,
        query: trimmed,
        isYamlKey: false,
        lineIndex: i,
      });
    }
  }

  return lineQueries;
}

/**
 * Patch a composed WQL query back into a block content string without disturbing
 * sibling keys, comments, whitespace, or other queries.
 *
 * @param blockContent Raw block content (body between fences)
 * @param newQuery New composed WQL query string
 * @param queryIndex 0-based index of the target query to update (default 0)
 */
export function patchBlockQuery(
  blockContent: string,
  newQuery: string,
  queryIndex = 0,
): string {
  const queries = extractBlockQueries(blockContent);
  if (queries.length === 0) {
    // If empty or untracked content, replace entirely
    const hasTrailingNewline = blockContent.endsWith('\n');
    return hasTrailingNewline ? `${newQuery}\n` : newQuery;
  }

  const target = queries.find((q) => q.queryIndex === queryIndex);
  if (!target) {
    return blockContent;
  }

  const lines = blockContent.split('\n');
  const targetLine = lines[target.lineIndex];

  if (target.isYamlKey) {
    const match = targetLine.match(YAML_QUERY_LINE_REGEX);
    if (match) {
      const prefix = match[1];
      const quote = match[2];
      const suffix = match[4] ?? '';
      lines[target.lineIndex] = `${prefix}${quote}${newQuery}${quote}${suffix}`;
    } else {
      lines[target.lineIndex] = `query: ${newQuery}`;
    }
  } else {
    // Preserves leading indentation on line-based queries if present
    const indentMatch = targetLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    lines[target.lineIndex] = `${indent}${newQuery}`;
  }

  return lines.join('\n');
}
