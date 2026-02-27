import { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import * as terms from "../grammar/parser.terms";
import { ICodeStatement, ParsedCodeStatement } from "../core/models/CodeStatement";
import { FragmentType } from "../core/models/CodeFragment";
import { CodeMetadata } from "../core/models/CodeMetadata";

import { RepFragment } from "../runtime/compiler/fragments/RepFragment";
import { DurationFragment } from "../runtime/compiler/fragments/DurationFragment";
import { DistanceFragment } from "../runtime/compiler/fragments/DistanceFragment";
import { ResistanceFragment } from "../runtime/compiler/fragments/ResistanceFragment";
import { ActionFragment } from "../runtime/compiler/fragments/ActionFragment";
import { TextFragment } from "../runtime/compiler/fragments/TextFragment";
import { RoundsFragment } from "../runtime/compiler/fragments/RoundsFragment";
import { IncrementFragment } from "../runtime/compiler/fragments/IncrementFragment";
import { GroupFragment } from "../runtime/compiler/fragments/GroupFragment";
import { EffortFragment } from "../runtime/compiler/fragments/EffortFragment";

export type GroupType = 'round' | 'compose' | 'repeat';

/**
 * Extracts WodScript statements from the CodeMirror editor state using the Lezer tree.
 */
export function extractStatements(state: EditorState): ICodeStatement[] {
  const tree = syntaxTree(state);
  const blocks: ICodeStatement[] = [];
  const source = state.doc.toString();

  tree.iterate({
    enter(node) {
      if (node.name === "Block") {
        const statement = new ParsedCodeStatement();
        const fragmentPairs: { fragment: any, meta: CodeMetadata }[] = [];
        
        let cursor = node.node.cursor();
        if (cursor.firstChild()) {
          do {
            const child = cursor.node;
            const text = source.slice(child.from, child.to);
            const meta: CodeMetadata = {
              line: state.doc.lineAt(child.from).number,
              startOffset: child.from,
              endOffset: child.to,
              columnStart: child.from - state.doc.lineAt(child.from).from,
              columnEnd: child.to - state.doc.lineAt(child.from).from,
              length: child.to - child.from,
              raw: text
            };

            switch (child.type.id) {
              case terms.Lap: {
                const type: GroupType = text === "+" ? 'compose' : 'round';
                fragmentPairs.push({ fragment: new GroupFragment(type, text), meta });
                break;
              }
              case terms.Fragment: {
                const fragmentNode = child.firstChild;
                if (!fragmentNode) break;
                
                const fragText = source.slice(fragmentNode.from, fragmentNode.to);
                const fragMeta: CodeMetadata = {
                  line: state.doc.lineAt(fragmentNode.from).number,
                  startOffset: fragmentNode.from,
                  endOffset: fragmentNode.to,
                  columnStart: fragmentNode.from - state.doc.lineAt(fragmentNode.from).from,
                  columnEnd: fragmentNode.to - state.doc.lineAt(fragmentNode.from).from,
                  length: fragmentNode.to - fragmentNode.from,
                  raw: fragText
                };

                switch (fragmentNode.type.id) {
                  case terms.Duration: {
                    const trend = fragmentNode.getChild(terms.Trend);
                    const forceCountUp = !!trend;
                    const timerNode = fragmentNode.getChild(terms.Timer) || fragmentNode.getChild(terms.CollectibleTimer);
                    if (timerNode) {
                      const timerText = source.slice(timerNode.from, timerNode.to);
                      fragmentPairs.push({ fragment: new DurationFragment(timerText, forceCountUp), meta: fragMeta });
                    }
                    break;
                  }
                  case terms.Rounds: {
                    const sequence = fragmentNode.getChild(terms.Sequence);
                    if (sequence) {
                      const numbers = source.slice(sequence.from, sequence.to).split('-').map(n => parseInt(n.trim()));
                      if (numbers.length === 1) {
                        fragmentPairs.push({ fragment: new RoundsFragment(numbers[0]), meta: fragMeta });
                      } else {
                        fragmentPairs.push({ fragment: new RoundsFragment(numbers.length), meta: fragMeta });
                        for (const n of numbers) {
                          fragmentPairs.push({ fragment: new RepFragment(n), meta: fragMeta });
                        }
                      }
                    } else {
                      const label = fragmentNode.getChild(terms.Identifier);
                      if (label) {
                        fragmentPairs.push({ fragment: new RoundsFragment(source.slice(label.from, label.to)), meta: fragMeta });
                      }
                    }
                    break;
                  }
                  case terms.Action: {
                    // Extract name from [:Name]
                    const actionText = fragText.substring(2, fragText.length - 1).trim();
                    fragmentPairs.push({ fragment: new ActionFragment(actionText, { raw: actionText }), meta: fragMeta });
                    break;
                  }
                  case terms.Text: {
                    const content = fragText.substring(2).trim();
                    fragmentPairs.push({ fragment: new TextFragment(content, undefined), meta: fragMeta });
                    break;
                  }
                  case terms.Quantity: {
                    const hasAtSign = !!fragmentNode.getChild(terms.AtSign);
                    const hasWeight = !!fragmentNode.getChild(terms.WeightUnit);
                    const hasDistance = !!fragmentNode.getChild(terms.DistanceUnit);
                    const numNode = fragmentNode.getChild(terms.Number);
                    
                    const value = numNode ? parseFloat(source.slice(numNode.from, numNode.to)) : undefined;
                    const unitNode = fragmentNode.getChild(terms.WeightUnit) || fragmentNode.getChild(terms.DistanceUnit);
                    const unit = unitNode ? source.slice(unitNode.from, unitNode.to) : "";

                    if (hasWeight || hasAtSign) {
                      fragmentPairs.push({ fragment: new ResistanceFragment(value, unit), meta: fragMeta });
                    } else if (hasDistance) {
                      fragmentPairs.push({ fragment: new DistanceFragment(value, unit), meta: fragMeta });
                    } else {
                      fragmentPairs.push({ fragment: new RepFragment(value), meta: fragMeta });
                    }
                    break;
                  }
                  case terms.Effort: {
                    fragmentPairs.push({ fragment: new EffortFragment(fragText), meta: fragMeta });
                    break;
                  }
                }
                break;
              }
            }
          } while (cursor.nextSibling());
        }

        const mergedPairs = mergeFragments(fragmentPairs);
        statement.fragments = mergedPairs.map(p => p.fragment);
        statement.fragmentMeta = new Map(mergedPairs.map(p => [p.fragment, p.meta]));
        
        statement.meta = {
          line: state.doc.lineAt(node.from).number,
          startOffset: node.from,
          endOffset: node.to,
          columnStart: node.from - state.doc.lineAt(node.from).from,
          columnEnd: node.to - state.doc.lineAt(node.from).from,
          length: node.to - node.from,
          raw: source.slice(node.from, node.to)
        };
        statement.id = statement.meta.line;
        blocks.push(statement);
      }
    },
  });

  // Indentation-based nesting logic (matching timer.visitor.ts)
  const parentChildMap = new Map<number, number[]>();
  let stack: { columnStart: number; block: ICodeStatement }[] = [];

  for (const block of blocks) {
    stack = stack.filter(item => item.columnStart < block.meta.columnStart);

    if (stack.length > 0) {
      for (const parent of stack) {
        if (!parentChildMap.has(parent.block.id)) {
          parentChildMap.set(parent.block.id, []);
        }
        parentChildMap.get(parent.block.id)!.push(block.id);
        block.parent = parent.block.id;
      }
    }

    stack.push({ columnStart: block.meta.columnStart, block });
  }

  // Finalize children and leaf status
  for (const block of blocks) {
    const flatChildren = parentChildMap.get(block.id) || [];
    block.children = groupChildrenByGroupFragments(flatChildren, blocks);
    block.isLeaf = block.children.length === 0;
  }

  return blocks;
}

/**
 * Merges adjacent fragments that should have been parsed as a single fragment.
 * Handles overlaps like Rep + ResistanceUnit -> Resistance.
 */
function mergeFragments(pairs: { fragment: any, meta: CodeMetadata }[]): { fragment: any, meta: CodeMetadata }[] {
  if (pairs.length < 2) return pairs;

  const result: { fragment: any, meta: CodeMetadata }[] = [];
  let current = pairs[0];

  for (let i = 1; i < pairs.length; i++) {
    const next = pairs[i];

    // Merge adjacent Effort fragments
    if (current.fragment instanceof EffortFragment && next.fragment instanceof EffortFragment) {
      // If they are separated only by whitespace or nothing
      const gap = next.meta.startOffset - current.meta.endOffset;
      if (gap <= 1) { // allow one space
        const mergedMeta: CodeMetadata = {
          ...current.meta,
          endOffset: next.meta.endOffset,
          columnEnd: next.meta.columnEnd,
          length: next.meta.endOffset - current.meta.startOffset,
          raw: current.meta.raw + (gap === 1 ? " " : "") + next.meta.raw
        };
        current = { 
            fragment: new EffortFragment(current.fragment.effort + (gap === 1 ? " " : "") + next.fragment.effort), 
            meta: mergedMeta 
        };
        continue;
      }
    }

    // Merge Rep + ResistanceUnit or DistanceUnit
    if (current.fragment instanceof RepFragment && (next.fragment instanceof ResistanceFragment || next.fragment instanceof DistanceFragment)) {
      if (next.meta.startOffset === current.meta.endOffset) {
         const mergedMeta: CodeMetadata = {
          ...current.meta,
          endOffset: next.meta.endOffset,
          columnEnd: next.meta.columnEnd,
          length: next.meta.endOffset - current.meta.startOffset,
          raw: current.meta.raw + next.meta.raw
        };
        if (next.fragment instanceof ResistanceFragment && next.fragment.value.amount === undefined) {
          current = { 
              fragment: new ResistanceFragment(current.fragment.reps, next.fragment.units), 
              meta: mergedMeta 
          };
          continue;
        }
        if (next.fragment instanceof DistanceFragment && next.fragment.value.amount === undefined) {
          current = { 
              fragment: new DistanceFragment(current.fragment.reps, next.fragment.units), 
              meta: mergedMeta 
          };
          continue;
        }
      }
    }

    result.push(current);
    current = next;
  }
  result.push(current);

  return result;
}

/**
 * Groups consecutive compose group fragments together.
 * Logic matching timer.visitor.ts.
 */
function groupChildrenByGroupFragments(childIds: number[], allBlocks: ICodeStatement[]): number[][] {
  if (childIds.length === 0) return [];

  const blocksById = new Map(allBlocks.map(b => [b.id, b]));
  const groups: number[][] = [];

  for (const childId of childIds) {
    const childBlock = blocksById.get(childId);
    const groupFragment = childBlock?.fragments.find(f => f.fragmentType === FragmentType.Group) as GroupFragment;
    const type = groupFragment?.group || 'repeat';

    if (type === 'compose' && groups.length > 0) {
      groups[groups.length - 1].push(childId);
    } else {
      groups.push([childId]);
    }
  }

  return groups;
}
