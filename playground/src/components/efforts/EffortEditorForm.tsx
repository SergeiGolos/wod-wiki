/**
 * EffortEditorForm — editable form for user-created efforts.
 *
 * Supports hybrid coefficient UX:
 *   - Preset buttons for common multipliers (0.8x–1.2x)
 *   - Advanced JSON fallback for non-standard coefficients and hard overrides
 */

import React, { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { IEffort, EffortDerivation } from '@/effort-registry';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const COEFFICIENT_PRESETS = [0.8, 0.9, 1.0, 1.1, 1.2];
const INTENSITY_TIERS = ['low', 'moderate', 'high'] as const;

interface EffortEditorFormProps {
  effort: IEffort;
  onSave: (effort: IEffort) => void;
  onDelete?: () => void;
  onCancel?: () => void;
}

export function EffortEditorForm({ effort, onSave, onDelete, onCancel }: EffortEditorFormProps) {
  const [label, setLabel] = useState(effort.label);
  const [slug, setSlug] = useState(effort.slug);
  const [met, setMet] = useState(String(effort.baseAttributes.met));
  const [discipline, setDiscipline] = useState(effort.baseAttributes.discipline ?? '');
  const [intensityTier, setIntensityTier] = useState(effort.baseAttributes.intensityTier ?? '');
  const [aliasesText, setAliasesText] = useState(effort.aliases.join(', '));
  const [coefficients, setCoefficients] = useState<Record<string, number>>(
    effort.derivation?.coefficients ?? {},
  );
  const [hardOverrides, setHardOverrides] = useState<Record<string, unknown>>(
    effort.derivation?.hardOverrides ?? {},
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedJson, setAdvancedJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const isUserEffort = effort.registrySource === 'user';

  const derivedMet = useMemo(() => {
    const base = parseFloat(met) || effort.baseAttributes.met;
    let result = base;
    for (const [key, val] of Object.entries(coefficients)) {
      if (key === 'met' && typeof val === 'number') {
        result = base * val;
      }
    }
    return result;
  }, [met, coefficients, effort.baseAttributes.met]);

  const handlePreset = useCallback((preset: number) => {
    setCoefficients(prev => ({ ...prev, met: preset }));
  }, []);

  const handleToggleAdvanced = useCallback(() => {
    if (!showAdvanced) {
      const derivation: EffortDerivation = {
        parentSlug: effort.derivation?.parentSlug,
        coefficients: Object.keys(coefficients).length > 0 ? coefficients : undefined,
        hardOverrides: Object.keys(hardOverrides).length > 0 ? hardOverrides : undefined,
      };
      setAdvancedJson(JSON.stringify(derivation, null, 2));
      setJsonError(null);
    }
    setShowAdvanced(prev => !prev);
  }, [showAdvanced, coefficients, hardOverrides, effort.derivation?.parentSlug]);

  const handleAdvancedChange = useCallback((value: string) => {
    setAdvancedJson(value);
    try {
      const parsed = JSON.parse(value) as EffortDerivation;
      setCoefficients(parsed.coefficients ?? {});
      setHardOverrides(parsed.hardOverrides ?? {});
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON');
    }
  }, []);

  const handleSave = useCallback(() => {
    const metNum = parseFloat(met);
    const newEffort: IEffort = {
      ...effort,
      id: effort.id || `effort-user-${uuidv4()}`,
      slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
      label: label.trim(),
      aliases: aliasesText
        .split(',')
        .map(a => a.trim())
        .filter(Boolean),
      baseAttributes: {
        met: Number.isFinite(metNum) ? metNum : effort.baseAttributes.met,
        discipline: discipline.trim() || undefined,
        intensityTier: (intensityTier as any) || undefined,
      },
      registrySource: 'user',
      derivation: {
        parentSlug: effort.derivation?.parentSlug,
        coefficients: Object.keys(coefficients).length > 0 ? { ...coefficients } : undefined,
        hardOverrides: Object.keys(hardOverrides).length > 0 ? { ...hardOverrides } : undefined,
      },
      updatedAt: new Date().toISOString(),
    };
    onSave(newEffort);
  }, [effort, label, slug, met, discipline, intensityTier, aliasesText, coefficients, hardOverrides, onSave]);

  return (
    <div className="space-y-6">
      {/* Basic fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="effort-label">Label</Label>
          <input
            id="effort-label"
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. My Custom HIIT Circuit"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="effort-slug">Slug (unique ID)</Label>
          <input
            id="effort-slug"
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring font-mono"
            placeholder="my-custom-hiit-circuit"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="effort-met">MET</Label>
            <input
              id="effort-met"
              type="number"
              step="0.1"
              value={met}
              onChange={e => setMet(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            {derivedMet !== parseFloat(met) && (
              <p className="text-xs text-muted-foreground">
                Effective MET: <span className="font-semibold text-foreground">{derivedMet.toFixed(1)}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="effort-discipline">Discipline</Label>
            <input
              id="effort-discipline"
              type="text"
              value={discipline}
              onChange={e => setDiscipline(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. strength"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Intensity Tier</Label>
          <div className="flex flex-wrap gap-2">
            {INTENSITY_TIERS.map(tier => (
              <button
                key={tier}
                type="button"
                onClick={() => setIntensityTier(intensityTier === tier ? '' : tier)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  intensityTier === tier
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="effort-aliases">Aliases (comma-separated)</Label>
          <input
            id="effort-aliases"
            type="text"
            value={aliasesText}
            onChange={e => setAliasesText(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            placeholder="alias1, alias2, alias3"
          />
          <div className="flex flex-wrap gap-1">
            {aliasesText
              .split(',')
              .map(a => a.trim())
              .filter(Boolean)
              .map(alias => (
                <Badge key={alias} variant="secondary" className="text-[10px]">
                  {alias}
                </Badge>
              ))}
          </div>
        </div>
      </div>

      {/* Coefficient presets */}
      <div className="space-y-2">
        <Label>Coefficient Presets (MET multiplier)</Label>
        <div className="flex flex-wrap gap-2">
          {COEFFICIENT_PRESETS.map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePreset(preset)}
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                coefficients.met === preset
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {preset.toFixed(1)}×
            </button>
          ))}
          {coefficients.met && (
            <button
              type="button"
              onClick={() => {
                const next = { ...coefficients };
                delete next.met;
                setCoefficients(next);
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Advanced JSON */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleToggleAdvanced}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          {showAdvanced ? 'Hide Advanced JSON Editor' : 'Advanced: Edit JSON'}
        </button>

        {showAdvanced && (
          <div className="space-y-2">
            <textarea
              value={advancedJson}
              onChange={e => handleAdvancedChange(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder='{"coefficients": {"met": 1.1}, "hardOverrides": {}}'
            />
            {jsonError && (
              <p className="text-xs text-destructive">{jsonError}</p>
            )}
          </div>
        )}
      </div>

      {/* Derivation lineage */}
      {effort.derivation?.parentSlug && (
        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          Derived from:{' '}
          <span className="font-mono font-semibold text-foreground">
            {effort.derivation.parentSlug}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={!label.trim() || !slug.trim()}>
          Save
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {isUserEffort && onDelete && (
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
