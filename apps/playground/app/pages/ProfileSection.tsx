/**
 * ProfileSection — /settings/profile. Edits the single local membership:
 * avatar (center-cropped to a JPEG data URL via resizeImageToDataUrl),
 * display name, birth date (age is derived at render, never stored), and
 * body metrics with unit toggles (value converts when the unit changes).
 * Changes apply immediately, matching the other settings sections.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, UserRound } from 'lucide-react'
import type { Membership } from '@bitcobblers/wod-wiki-storage'
import { profileService } from '@/services/storage'
import { resizeImageToDataUrl, type MembershipPatch } from '@/services/profile'
import { cn } from '@/lib/utils'

const LB_PER_KG = 2.20462
const CM_PER_IN = 2.54

const inputClass =
  'w-full h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:border-primary'

function ageFromBirthDate(birthDate: string | undefined): number | undefined {
  if (!birthDate) return undefined
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return undefined
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const month = now.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age--
  return age
}

function initialsOf(displayName: string | undefined): string {
  const parts = (displayName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((part) => part[0]!.toUpperCase()).join('')
}

function UnitToggle({ unit, other, onSwitch }: {
  unit: string
  other: string
  onSwitch: () => void
}) {
  return (
    <div className="flex rounded-md border border-input overflow-hidden shrink-0" role="group">
      {[unit, other].map((u, i) => (
        <button
          key={u}
          type="button"
          aria-pressed={i === 0}
          onClick={i === 1 ? onSwitch : undefined}
          className={cn(
            'px-2.5 h-9 text-xs font-medium transition-colors',
            i === 0 ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground hover:bg-muted',
          )}
        >
          {u}
        </button>
      ))}
    </div>
  )
}

export function ProfileSection() {
  const [membership, setMembership] = useState<Membership | null>(null)
  // Text drafts are locally owned while typing — async saves resolve later,
  // so inputs must never re-render from persisted state mid-keystroke.
  const [draft, setDraft] = useState({ displayName: '', birthDate: '', weight: '', height: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let mounted = true
    profileService.current().then((m) => {
      if (mounted) setMembership(m)
    }).catch(console.error)
    return () => { mounted = false }
  }, [])

  // One-time sync from the loaded membership (id never changes afterwards,
  // so later saves re-rendering membership cannot clobber in-progress input).
  useEffect(() => {
    if (!membership) return
    setDraft({
      displayName: membership.displayName ?? '',
      birthDate: membership.birthDate ?? '',
      weight: membership.weight != null ? String(membership.weight) : '',
      height: membership.height != null ? String(membership.height) : '',
    })
  }, [membership?.id])

  const apply = useCallback(async (patch: MembershipPatch) => {
    try {
      setMembership(await profileService.update(patch))
    } catch (error) {
      console.error(error)
    }
  }, [])

  const handleAvatarFile = useCallback(async (file: File | undefined) => {
    if (!file) return
    try {
      await apply({ picture: await resizeImageToDataUrl(file) })
    } catch (error) {
      console.error(error)
    }
  }, [apply])

  if (!membership) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="profile-loading">
        Loading profile…
      </p>
    )
  }

  const age = ageFromBirthDate(membership.birthDate)
  const weightUnit = membership.weightUnit ?? 'kg'
  const heightUnit = membership.heightUnit ?? 'cm'

  return (
    <div className="space-y-8">
      {/* 1. Avatar */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <UserRound className="size-4 text-primary" />
            Profile Picture
          </h2>
          <p className="text-sm text-muted-foreground">
            Click the picture to choose an image — it is center-cropped and stored locally.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile picture"
            data-testid="profile-avatar"
            className="relative group size-20 rounded-full overflow-hidden border border-border bg-muted shrink-0 cursor-pointer"
          >
            {membership.picture ? (
              <img src={membership.picture} alt="" className="size-full object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-muted-foreground">
                {initialsOf(membership.displayName)}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity">
              <Camera className="size-5 text-white" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => {
              void handleAvatarFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </section>

      {/* 2. Identity + body metrics */}
      <section className="space-y-4 pt-4 border-t border-border/50">
        <div>
          <h2 className="text-base font-semibold text-foreground">Details</h2>
          <p className="text-sm text-muted-foreground">
            Used by journal analytics (age from birth date, metric conversions). Changes are saved immediately.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div>
            <label htmlFor="profile-display-name" className="block text-xs font-medium text-muted-foreground mb-1">
              Display Name
            </label>
            <input
              id="profile-display-name"
              data-testid="profile-display-name"
              className={inputClass}
              placeholder="Your name"
              value={draft.displayName}
              onChange={(e) => {
                setDraft((d) => ({ ...d, displayName: e.target.value }))
                void apply({ displayName: e.target.value })
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-birth-date" className="block text-xs font-medium text-muted-foreground mb-1">
                Birth Date{age !== undefined ? ` · Age ${age}` : ''}
              </label>
              <input
                id="profile-birth-date"
                data-testid="profile-birth-date"
                type="date"
                className={inputClass}
                value={draft.birthDate}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, birthDate: e.target.value }))
                  void apply({ birthDate: e.target.value || undefined })
                }}
              />
            </div>
            <div />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-weight" className="block text-xs font-medium text-muted-foreground mb-1">
                Weight
              </label>
              <div className="flex gap-2">
                <input
                  id="profile-weight"
                  data-testid="profile-weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  className={inputClass}
                  placeholder={weightUnit === 'kg' ? 'e.g. 75' : 'e.g. 165'}
                  value={draft.weight}
                  onChange={(e) => {
                    const raw = e.target.value
                    setDraft((d) => ({ ...d, weight: raw }))
                    // Partial text ("8e", "-") stays draft-only until it parses.
                    if (raw === '') void apply({ weight: undefined })
                    else if (Number.isFinite(Number(raw))) void apply({ weight: Number(raw) })
                  }}
                />
                <UnitToggle
                  unit={weightUnit}
                  other={weightUnit === 'kg' ? 'lb' : 'kg'}
                  onSwitch={() => void apply({
                    weightUnit: weightUnit === 'kg' ? 'lb' : 'kg',
                    weight: membership.weight != null
                      ? (weightUnit === 'kg' ? membership.weight * LB_PER_KG : membership.weight / LB_PER_KG)
                      : undefined,
                  })}
                />
              </div>
            </div>
            <div>
              <label htmlFor="profile-height" className="block text-xs font-medium text-muted-foreground mb-1">
                Height
              </label>
              <div className="flex gap-2">
                <input
                  id="profile-height"
                  data-testid="profile-height"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  className={inputClass}
                  placeholder={heightUnit === 'cm' ? 'e.g. 180' : 'e.g. 71'}
                  value={draft.height}
                  onChange={(e) => {
                    const raw = e.target.value
                    setDraft((d) => ({ ...d, height: raw }))
                    if (raw === '') void apply({ height: undefined })
                    else if (Number.isFinite(Number(raw))) void apply({ height: Number(raw) })
                  }}
                />
                <UnitToggle
                  unit={heightUnit}
                  other={heightUnit === 'cm' ? 'in' : 'cm'}
                  onSwitch={() => void apply({
                    heightUnit: heightUnit === 'cm' ? 'in' : 'cm',
                    height: membership.height != null
                      ? (heightUnit === 'cm' ? membership.height / CM_PER_IN : membership.height * CM_PER_IN)
                      : undefined,
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
