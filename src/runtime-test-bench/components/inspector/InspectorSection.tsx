/**
 * InspectorSection — collapsible section with phase-gated header.
 *
 * Renders collapsed by default. Opens automatically when the required
 * phase is reached. Header color encodes state: pending/active/complete.
 */

import React, { useState, useEffect } from 'react';
import type { InspectorPhase } from '../types/inspector';

const PHASE_ORDER: InspectorPhase[] = [
  'idle',
  'compile_ready',
  'plan_ready',
  'running',
  'processing',
  'collected',
  'analytics_ready',
  'complete',
];

function phaseIndex(p: InspectorPhase): number {
  return PHASE_ORDER.indexOf(p);
}

interface InspectorSectionProps {
  title: string;
  requiredPhase: InspectorPhase;
  currentPhase: InspectorPhase;
  /** If true, section auto-opens when its phase is reached */
  autoOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}

export const InspectorSection: React.FC<InspectorSectionProps> = ({
  title,
  requiredPhase,
  currentPhase,
  autoOpen = true,
  badge,
  children,
}) => {
  const reached   = phaseIndex(currentPhase) >= phaseIndex(requiredPhase);
  const isCurrent = phaseIndex(currentPhase) === phaseIndex(requiredPhase);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (reached && autoOpen) setOpen(true);
  }, [reached, autoOpen]);

  const headerColor = !reached
    ? 'bg-gray-800 text-gray-500'
    : isCurrent
    ? 'bg-yellow-900 text-yellow-200'
    : 'bg-gray-700 text-gray-200';

  const statusIcon = !reached ? '…' : isCurrent ? '▶' : '✓';

  return (
    <div className="mb-2 border border-gray-700 rounded overflow-hidden">
      <button
        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-mono font-semibold ${headerColor} hover:brightness-110 transition-all`}
        onClick={() => reached && setOpen(o => !o)}
        disabled={!reached}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="text-xs w-4">{statusIcon}</span>
          {title}
          {badge && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-black/30 text-gray-300 font-normal">
              {badge}
            </span>
          )}
        </span>
        <span className="text-xs opacity-50">{open ? '▲' : '▼'}</span>
      </button>

      {reached && open && (
        <div className="bg-gray-900 p-3">
          {children}
        </div>
      )}
    </div>
  );
};
