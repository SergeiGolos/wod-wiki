/**
 * Date-formatting helpers shared by the Library and the prototype variants.
 * Kept tiny on purpose; locale comes from the "Date language" preference
 * (#858) — Auto (browser) unless the user overrides it.
 */
import { getDateLocale } from './dateLocale'

/** Return today's date as `YYYY-MM-DD` (UTC). */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Format a `YYYY-MM-DD` string as a localised long date (UTC). */
export function formatDateHeader(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d!))
  return date.toLocaleDateString(getDateLocale(), { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}
