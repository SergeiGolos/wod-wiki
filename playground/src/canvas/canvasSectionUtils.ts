import type { CanvasSection } from './parseCanvasMarkdown'

export const SECTION_THEME_STYLES: Record<string, { panel: string; accent: string; progress: string }> = {
  slate: {
    panel: 'border-slate-500/35 shadow-slate-500/12',
    accent: 'from-slate-500/70 via-slate-400/25 to-transparent',
    progress: 'from-slate-500 to-slate-400',
  },
  amber: {
    panel: 'border-amber-500/35 shadow-amber-500/12',
    accent: 'from-amber-500/75 via-amber-400/25 to-transparent',
    progress: 'from-amber-500 to-orange-400',
  },
  emerald: {
    panel: 'border-emerald-500/35 shadow-emerald-500/12',
    accent: 'from-emerald-500/75 via-emerald-400/25 to-transparent',
    progress: 'from-emerald-500 to-teal-400',
  },
  sky: {
    panel: 'border-sky-500/35 shadow-sky-500/12',
    accent: 'from-sky-500/75 via-sky-400/25 to-transparent',
    progress: 'from-sky-500 to-cyan-400',
  },
  violet: {
    panel: 'border-violet-500/35 shadow-violet-500/12',
    accent: 'from-violet-500/75 via-fuchsia-400/25 to-transparent',
    progress: 'from-violet-500 to-fuchsia-400',
  },
  rose: {
    panel: 'border-rose-500/35 shadow-rose-500/12',
    accent: 'from-rose-500/75 via-pink-400/25 to-transparent',
    progress: 'from-rose-500 to-pink-400',
  },
}

export const hasAttr = (s: CanvasSection, a: string) => s.attrs.includes(a)
export const getAttrValue = (s: CanvasSection, key: string) =>
  s.attrs.find(attr => attr.startsWith(`${key}:`))?.slice(key.length + 1)
export const isFullBleed = (s: CanvasSection) => hasAttr(s, 'full-bleed')
export const isDark = (s: CanvasSection) => hasAttr(s, 'dark')
export const getSectionDensity = (s: CanvasSection) => getAttrValue(s, 'density') ?? 'default'
export const getSectionTheme = (s: CanvasSection) => getAttrValue(s, 'theme') ?? 'slate'
export const getSectionThemeStyles = (s: CanvasSection) => SECTION_THEME_STYLES[getSectionTheme(s)] ?? SECTION_THEME_STYLES.slate
