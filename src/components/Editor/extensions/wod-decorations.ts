import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  GutterMarker,
  gutter
} from "@codemirror/view";
import { RangeSetBuilder, StateField, StateEffect, Extension } from "@codemirror/state";
import { WodBlock } from "../../../markdown-editor/types";
import { detectWodBlocks } from "../../../markdown-editor/utils/blockDetection";
import { FragmentType } from "../../../core/models/CodeFragment";

// Effect to update blocks in state
export const setWodBlocks = StateEffect.define<WodBlock[]>();

// Field to store detected blocks
export const wodBlocksField = StateField.define<WodBlock[]>({
  create() { return []; },
  update(value, tr) {
    for (let e of tr.effects) if (e.is(setWodBlocks)) return e.value;
    if (tr.docChanged) return detectWodBlocks(tr.newDoc.toString());
    return value;
  }
});

class StartWorkoutGutterMarker extends GutterMarker {
  constructor(readonly block: WodBlock, readonly onStart?: (block: WodBlock) => void) {
    super();
  }
  
  toDOM() {
    let span = document.createElement("span");
    span.className = "cm-wod-start-button cursor-pointer hover:scale-110 transition-transform flex items-center justify-center";
    span.textContent = "▶️";
    span.title = "Start Workout";
    span.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onStart?.(this.block);
    };
    return span;
  }
}

class WodStartGutterMarker extends GutterMarker {
  toDOM() {
    let span = document.createElement("span");
    span.className = "flex items-center justify-center text-xs opacity-50";
    span.textContent = "🏋️";
    return span;
  }
}

export interface WodDecorationsOptions {
  onStartWorkout?: (block: WodBlock) => void;
  onBlocksChange?: (blocks: WodBlock[]) => void;
}

export function wodDecorations(options: WodDecorationsOptions = {}): Extension {
  const plugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    lastBlocksJson: string = "";

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
      this.notifyBlocks(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view);
      }
      if (update.docChanged) {
        this.notifyBlocks(update.view);
      }
    }

    notifyBlocks(view: EditorView) {
      const blocks = view.state.field(wodBlocksField);
      const blocksJson = JSON.stringify(blocks.map(b => ({ id: b.id, startLine: b.startLine, endLine: b.endLine })));
      if (blocksJson !== this.lastBlocksJson) {
        this.lastBlocksJson = blocksJson;
        options.onBlocksChange?.(blocks);
      }
    }

    buildDecorations(view: EditorView) {
      const blocks = view.state.field(wodBlocksField);
      const builder = new RangeSetBuilder<Decoration>();
      const { head } = view.state.selection.main;
      const cursorLine = view.state.doc.lineAt(head).number - 1;

      for (let block of blocks) {
        const isActive = cursorLine >= block.startLine && cursorLine <= block.endLine;
        
        // Block boundary highlighting
        const from = view.state.doc.line(block.startLine + 1).from;
        const to = view.state.doc.line(block.endLine + 1).to;
        
        builder.add(from, to, Decoration.line({
          attributes: { class: isActive ? "cm-wod-block-active bg-blue-500/10 dark:bg-blue-400/10 border-l-2 border-blue-500" : "cm-wod-block bg-yellow-500/5 dark:bg-yellow-400/5 border-l-2 border-yellow-500/30" }
        }));

        // Inlay hints for non-active blocks
        if (!isActive && block.statements) {
             for (const stmt of block.statements) {
                 for (const frag of stmt.fragments) {
                     if (frag.meta) {
                         // stmt.fragments[0].meta.line is 1-based relative to block content line 1
                         // block content line 1 is doc line block.startLine + 2
                         const absLineNo = block.startLine + 1 + frag.meta.line;
                         if (absLineNo <= view.state.doc.lines) {
                            const absLine = view.state.doc.line(absLineNo);
                            const pos = absLine.from + frag.meta.columnStart;
                            const emoji = getEmojiForFragment(frag.fragmentType);
                            if (emoji) {
                                builder.add(pos, pos, Decoration.widget({
                                    side: -1, // before
                                    widget: new class extends WidgetType {
                                        toDOM() {
                                            let s = document.createElement("span");
                                            s.textContent = emoji + " ";
                                            s.className = "cm-wod-inlay-hint italic opacity-70 select-none mr-1";
                                            return s;
                                        }
                                    }
                                }));
                            }
                         }
                     }
                 }
             }
        }
      }
      return builder.finish();
    }
  }, {
    decorations: v => v.decorations
  });

  const wodGutter = gutter({
    class: "cm-wod-gutter w-8",
    markers: (view) => {
      const blocks = view.state.field(wodBlocksField);
      const builder = new RangeSetBuilder<GutterMarker>();
      for (let block of blocks) {
        const line = view.state.doc.line(block.startLine + 1);
        builder.add(line.from, line.from, new StartWorkoutGutterMarker(block, options.onStartWorkout));
      }
      return builder.finish();
    }
  });

  return [wodBlocksField, plugin, wodGutter];
}

function getEmojiForFragment(type: FragmentType): string | null {
    switch (type) {
        case FragmentType.Duration: return '⏱️';
        case FragmentType.Resistance: return '💪';
        case FragmentType.Rep: return '×';
        case FragmentType.Rounds: return '🔄';
        case FragmentType.Action: return '▶️';
        case FragmentType.Distance: return '📏';
        default: return null;
    }
}
