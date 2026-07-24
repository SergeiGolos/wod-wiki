// PROTOTYPE — throwaway
// CodeMirror 6 extension that highlights the lines the user changed in the
// sticky demo editor and appends an after-line widget reading
// "← you changed this ✓".

import { StateEffect, StateField, RangeSetBuilder } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view'

const editFeedbackEffect = StateEffect.define<string[]>()

class EditFeedbackWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span')
    span.textContent = ' ← you changed this ✓'
    span.className = 'cm-edit-feedback-widget'
    return span
  }

  eq(other: WidgetType) {
    return other instanceof EditFeedbackWidget
  }
}

const lineHighlight = Decoration.line({
  class: 'cm-edit-feedback-line',
})

const afterLineWidget = Decoration.widget({
  widget: new EditFeedbackWidget(),
  side: 1,
  block: false,
})

const feedbackField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes)
    for (const effect of tr.effects) {
      if (effect.is(editFeedbackEffect)) {
        const changedLines = effect.value
        const builder = new RangeSetBuilder<Decoration>()
        const { doc } = tr.state
        const matched = new Set<number>()

        for (const text of changedLines) {
          const trimmed = text.trim()
          if (!trimmed) continue

          for (let i = 1; i <= doc.lines; i++) {
            if (matched.has(i)) continue
            const line = doc.line(i)
            if (line.text.trim() === trimmed) {
              builder.add(line.from, line.from, lineHighlight)
              builder.add(line.to, line.to, afterLineWidget)
              matched.add(i)
              break
            }
          }
        }

        decorations = builder.finish()
      }
    }
    return decorations
  },
  provide: (field) => EditorView.decorations.from(field),
})

const feedbackTheme = EditorView.theme({
  '& .cm-edit-feedback-line': {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  '& .cm-edit-feedback-widget': {
    color: 'rgba(20, 184, 166, 0.85)',
    fontSize: '11px',
    fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
    marginLeft: '8px',
    fontWeight: 500,
  },
})

export function editFeedbackExtension() {
  return [feedbackField, feedbackTheme]
}

export function dispatchEditFeedback(view: EditorView, changedLines: string[]) {
  view.dispatch({
    effects: [editFeedbackEffect.of(changedLines)],
  })
}
