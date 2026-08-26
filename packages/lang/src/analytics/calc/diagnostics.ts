import { DimVector, DIM_ZERO } from './dimensions';
import { LookupRegistry, ILookupTable } from './lookup';
import { CalculationDefinition } from './types';

export interface CalcDiagnostic {
  severity: 'error' | 'warning';
  message: string;
}

export interface CalcAnalysis {
  defs: CalculationDefinition[];
  diagnostics: CalcDiagnostic[];
  dim: DimVector | undefined;
  compound: string | undefined;
}

function silentTable(
  id: string,
  fields: ILookupTable['fields'],
  missPolicy: 'absent' | 'default-row' = 'absent',
): ILookupTable {
  return { id, fields, missPolicy, get: () => undefined };
}

export function buildStaticLookups(): LookupRegistry {
  const reg = new LookupRegistry();
  reg.register(silentTable('effort', {
    met: { dimension: DIM_ZERO, type: 'number' },
    disciplineFactor: { dimension: DIM_ZERO, type: 'number' },
    discipline: { dimension: DIM_ZERO, type: 'string' },
    intensityTier: { dimension: DIM_ZERO, type: 'string' },
    resolvedFrom: { dimension: DIM_ZERO, type: 'string' },
  }, 'default-row'));
  reg.register(silentTable('rpe-labels', { rpe: { dimension: DIM_ZERO, type: 'number' } }));
  reg.register(silentTable('profile', { vo2max: { dimension: DIM_ZERO, type: 'number' } }));
  reg.register(silentTable('disciplines', { disciplineFactor: { dimension: DIM_ZERO, type: 'number' } }, 'default-row'));
  return reg;
}
