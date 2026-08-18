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

export function extractBlockQueries(blockContent: string): ExtractedQuery[] {
  const lines = blockContent.split('\n');
  const yamlQueries: ExtractedQuery[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(YAML_QUERY_LINE_REGEX);
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

  const lineQueries: ExtractedQuery[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }
    lineQueries.push({
      queryIndex: lineQueries.length,
      query: line,
      isYamlKey: false,
      lineIndex: i,
    });
  }

  return lineQueries;
}

export function patchBlockQuery(
  blockContent: string,
  newQuery: string,
  queryIndex = 0,
): string {
  const extracted = extractBlockQueries(blockContent);
  const target = extracted.find((e) => e.queryIndex === queryIndex);

  if (!target) {
    return blockContent;
  }

  const lines = blockContent.split('\n');
  const oldLine = lines[target.lineIndex];

  if (target.isYamlKey) {
    const match = oldLine.match(YAML_QUERY_LINE_REGEX);
    if (match) {
      const prefix = match[1];
      const quote = match[2];
      const suffix = match[4];
      lines[target.lineIndex] = `${prefix}${quote}${newQuery}${quote}${suffix}`;
    } else {
      lines[target.lineIndex] = `query: ${newQuery}`;
    }
  } else {
    const leadingWhitespace = oldLine.match(/^\s*/)?.[0] ?? '';
    lines[target.lineIndex] = `${leadingWhitespace}${newQuery}`;
  }

  return lines.join('\n');
}
