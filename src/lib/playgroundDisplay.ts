const TIMESTAMP_ID_REGEX = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})(?:-(\d{2})(?:-(\d{3}))?)?(?:-\d+)?$/;
const LEGACY_TIMESTAMP_ID_REGEX = /^(\d{4})-(\d{2})-(\d{2}) (\d{2})-(\d{2})(?:-(\d{2})\.(\d{3}))?$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function formatPlaygroundTimestampId(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');

  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    pad(date.getUTCMilliseconds(), 3),
  ].join('-');
}

export function formatPlaygroundTimestampLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  return `Playground – ${dateStr} ${timeStr}`;
}

function timestampFromMatch(match: RegExpMatchArray): number {
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? 0),
    Number(match[7] ?? 0),
  );
}

export function formatPlaygroundPageTitle(name: string): string {
  let decodedName = name;
  try {
    decodedName = decodeURIComponent(name);
  } catch {
    decodedName = name;
  }
  const timestampMatch = decodedName.match(TIMESTAMP_ID_REGEX) ?? decodedName.match(LEGACY_TIMESTAMP_ID_REGEX);
  if (timestampMatch) return formatPlaygroundTimestampLabel(timestampFromMatch(timestampMatch));
  if (UUID_REGEX.test(decodedName)) return 'Playground';
  return decodedName || 'Playground';
}
