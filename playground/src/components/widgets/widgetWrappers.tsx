/**
 * PlaygroundNotePage Widget Wrappers
 *
 * Adapts playground widgets (AttentionWidget, CodeExampleWidget, SyntaxGroupWidget)
 * to work with the WidgetRegistry/WidgetProps system used by NoteEditor.
 *
 * These wrappers receive callbacks from PlaygroundNotePage and return React components
 * compatible with WidgetProps.
 */

import React from 'react'
import type { WidgetProps } from '@/components/Editor/widgets/types'
import { AttentionWidget, type AttentionWidgetConfig, type AttentionActionType } from './AttentionWidget'
import { CodeExampleWidget, type CodeExampleWidgetConfig } from './CodeExampleWidget'
import { SyntaxGroupWidget, type SyntaxGroupWidgetConfig } from './SyntaxGroupWidget'

// ── AttentionWidgetWrapper ──────────────────────────────────────

export function createAttentionWidgetWrapper(
  onAttentionAction: (action: AttentionActionType) => void,
): React.ComponentType<WidgetProps> {
  return ({ config }: WidgetProps) => {
    return (
      <AttentionWidget
        config={config as AttentionWidgetConfig}
        onAction={onAttentionAction}
      />
    )
  }
}

// ── CodeExampleWidgetWrapper ────────────────────────────────────

export function createCodeExampleWidgetWrapper(
  isDarkMode: boolean,
  onRun: (script: string) => void,
): React.ComponentType<WidgetProps> {
  return ({ config }: WidgetProps) => {
    return (
      <CodeExampleWidget
        config={config as CodeExampleWidgetConfig}
        isDarkMode={isDarkMode}
        onRun={onRun}
      />
    )
  }
}

// ── SyntaxGroupWidgetWrapper ────────────────────────────────────

export function createSyntaxGroupWidgetWrapper(
  onOpenDocs: (docsPath: string) => void,
): React.ComponentType<WidgetProps> {
  return ({ config }: WidgetProps) => {
    return (
      <SyntaxGroupWidget
        config={config as SyntaxGroupWidgetConfig}
        onOpenDocs={onOpenDocs}
      />
    )
  }
}
