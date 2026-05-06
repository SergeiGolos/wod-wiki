import { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import * as terms from "../grammar/parser.terms";
import { ICodeStatement, ParsedCodeStatement } from "../core/models/CodeStatement";
import { MetricType } from "../core/models/Metric";
import { CodeMetadata } from "../core/models/CodeMetadata";

import { RepMetric } from "../runtime/compiler/metrics/RepMetric";
import { DurationMetric } from "../runtime/compiler/metrics/DurationMetric";
import { DistanceMetric } from "../runtime/compiler/metrics/DistanceMetric";
import { ResistanceMetric } from "../runtime/compiler/metrics/ResistanceMetric";
import { ActionMetric } from "../runtime/compiler/metrics/ActionMetric";
import { TextMetric } from "../runtime/compiler/metrics/TextMetric";
import { RoundsMetric } from "../runtime/compiler/metrics/RoundsMetric";
import { IncrementMetric } from "../runtime/compiler/metrics/IncrementMetric";
import { GroupMetric } from "../runtime/compiler/metrics/GroupMetric";
import { EffortMetric } from "../runtime/compiler/metrics/EffortMetric";

export type GroupType = 'round' | 'compose' | 'repeat';

/**
 * Extracts WhiteboardScript statements from the CodeMirror editor state using the Lezer tree.
 */
export function extractStatements(state: EditorState): ICodeStatement[] {
  const tree = syntaxTree(state);
  const blocks: ICodeStatement[] = [];
  const source = state.doc.toString();

  tree.iterate({
    enter(node) {
      if (node.name === "Block") {
        const statement = new ParsedCodeStatement();
        const metricPairs: { metrics: any, meta: CodeMetadata }[] = [];
        
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
                metricPairs.push({ metrics: new GroupMetric(type, text), meta });
                break;
              }
              case terms.Fragment: {
                const metricNode = child.firstChild;
                if (!metricNode) break;
                
                const fragText = source.slice(metricNode.from, metricNode.to);
                const fragMeta: CodeMetadata = {
                  line: state.doc.lineAt(metricNode.from).number,
                  startOffset: metricNode.from,
                  endOffset: metricNode.to,
                  columnStart: metricNode.from - state.doc.lineAt(metricNode.from).from,
                  columnEnd: metricNode.to - state.doc.lineAt(metricNode.from).from,
                  length: metricNode.to - metricNode.from,
                  raw: fragText
                };

                switch (metricNode.type.id) {
                  case terms.Duration: {
                    const trend = metricNode.getChild(terms.Trend);
                    const forceCountUp = !!trend;
                    // Check for '*' required-timer modifier (timer cannot be skipped)
                    const isRequired = fragText.includes('*');
                    if (isRequired) {
                      if (!statement.hints) statement.hints = new Set();
                      statement.hints.add('behavior.required_timer');
                    }
                    const timerNode = metricNode.getChild(terms.Timer) || metricNode.getChild(terms.CollectibleTimer);
                    if (timerNode) {
                      const timerText = source.slice(timerNode.from, timerNode.to);
                      metricPairs.push({ metrics: new DurationMetric(timerText, forceCountUp, isRequired), meta: fragMeta });
                    }
                    break;
                  }
                  case terms.Rounds: {
                    const sequence = metricNode.getChild(terms.Sequence);
                    if (sequence) {
                      const numbers = source.slice(sequence.from, sequence.to).split('-').map(n => parseInt(n.trim()));
                      if (numbers.length === 1) {
                        metricPairs.push({ metrics: new RoundsMetric(numbers[0]), meta: fragMeta });
                      } else {
                        metricPairs.push({ metrics: new RoundsMetric(numbers.length), meta: fragMeta });
                        for (const n of numbers) {
                          metricPairs.push({ metrics: new RepMetric(n), meta: fragMeta });
                        }
                      }
                    } else {
                      const label = metricNode.getChild(terms.Identifier);
                      if (label) {
                        metricPairs.push({ metrics: new RoundsMetric(source.slice(label.from, label.to)), meta: fragMeta });
                      }
                    }
                    break;
                  }
                  case terms.Action: {
                    // Extract name from [:Name] or [Name]
                    const hasColon = fragText.startsWith('[:');
                    const actionText = hasColon
                      ? fragText.substring(2, fragText.length - 1).trim()
                      : fragText.substring(1, fragText.length - 1).trim();
                    metricPairs.push({ metrics: new ActionMetric(actionText, { raw: actionText }), meta: fragMeta });
                    break;
                  }
                  case terms.Text: {
                    const content = fragText.substring(2).trim();
                    metricPairs.push({ metrics: new TextMetric(content, undefined), meta: fragMeta });
                    break;
                  }
                  case terms.Quantity: {
                    const hasAtSign = !!metricNode.getChild(terms.AtSign);
                    const hasWeight = !!metricNode.getChild(terms.WeightUnit);
                    const hasDistance = !!metricNode.getChild(terms.DistanceUnit);
                    const numNode = metricNode.getChild(terms.Number);
                    
                    const value = numNode ? parseFloat(source.slice(numNode.from, numNode.to)) : undefined;
                    const unitNode = metricNode.getChild(terms.WeightUnit) || metricNode.getChild(terms.DistanceUnit);
                    const unit = unitNode ? source.slice(unitNode.from, unitNode.to) : "";

                    if (hasWeight || hasAtSign) {
                      metricPairs.push({ metrics: new ResistanceMetric(value, unit), meta: fragMeta });
                    } else if (hasDistance) {
                      metricPairs.push({ metrics: new DistanceMetric(value, unit), meta: fragMeta });
                    } else {
                      metricPairs.push({ metrics: new RepMetric(value), meta: fragMeta });
                    }
                    break;
                  }
                  case terms.Effort: {
                    metricPairs.push({ metrics: new EffortMetric(fragText), meta: fragMeta });
                    break;
                  }
                }
                break;
              }
            }
          } while (cursor.nextSibling());
        }

        const mergedPairs = mergeFragments(metricPairs);
        statement.metrics = mergedPairs.map(p => p.metrics);
        statement.metricMeta = new Map(mergedPairs.map(p => [p.metrics, p.meta]));
        
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
    block.children = groupChildrenByGroupMetrics(flatChildren, blocks);
    block.isLeaf = block.children.length === 0;
  }

  return blocks;
}

/**
 * Merges adjacent metrics that should have been parsed as a single metrics.
 * Handles overlaps like Rep + ResistanceUnit -> Resistance.
 */
function mergeFragments(pairs: { metrics: any, meta: CodeMetadata }[]): { metrics: any, meta: CodeMetadata }[] {
  if (pairs.length < 2) return pairs;

  const result: { metrics: any, meta: CodeMetadata }[] = [];
  let current = pairs[0];

  for (let i = 1; i < pairs.length; i++) {
    const next = pairs[i];

    // Merge adjacent Effort metrics
    if (current.metrics instanceof EffortMetric && next.metrics instanceof EffortMetric) {
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
            metrics: new EffortMetric(current.metrics.effort + (gap === 1 ? " " : "") + next.metrics.effort), 
            meta: mergedMeta 
        };
        continue;
      }
    }

    // Merge Rep + ResistanceUnit or DistanceUnit
    if (current.metrics instanceof RepMetric && (next.metrics instanceof ResistanceMetric || next.metrics instanceof DistanceMetric)) {
      const gap = next.meta.startOffset - current.meta.endOffset;
      if (gap <= 1) { // allow one space
         const mergedMeta: CodeMetadata = {
          ...current.meta,
          endOffset: next.meta.endOffset,
          columnEnd: next.meta.columnEnd,
          length: next.meta.endOffset - current.meta.startOffset,
          raw: current.meta.raw + (gap === 1 ? " " : "") + next.meta.raw
        };
        if (next.metrics instanceof ResistanceMetric && (next.metrics.value as any).amount === undefined) {
          current = { 
              metrics: new ResistanceMetric(current.metrics.reps, next.metrics.unit), 
              meta: mergedMeta 
          };
          continue;
        }
        if (next.metrics instanceof DistanceMetric && (next.metrics.value as any).amount === undefined) {
          current = { 
              metrics: new DistanceMetric(current.metrics.reps, next.metrics.unit), 
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
 * Groups consecutive compose group metrics together.
 * Logic matching timer.visitor.ts.
 */
function groupChildrenByGroupMetrics(childIds: number[], allBlocks: ICodeStatement[]): number[][] {
  if (childIds.length === 0) return [];

  const blocksById = new Map(allBlocks.map(b => [b.id, b]));
  const groups: number[][] = [];

  for (const childId of childIds) {
    const childBlock = blocksById.get(childId);
    const groupFragment = childBlock?.metrics.find(f => f.type === MetricType.Group) as GroupMetric;
    const type = groupFragment?.group || 'repeat';

    if (type === 'compose' && groups.length > 0) {
      groups[groups.length - 1].push(childId);
    } else {
      groups.push([childId]);
    }
  }

  return groups;
}
