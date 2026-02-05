import { ICodeFragment, FragmentType } from "../core/models/CodeFragment";
import { CodeMetadata } from "../core/models/CodeMetadata";

import { EffortFragment } from "../runtime/compiler/fragments/EffortFragment";
import { ActionFragment } from "../runtime/compiler/fragments/ActionFragment";
import { IncrementFragment } from "../runtime/compiler/fragments/IncrementFragment";
import { GroupFragment } from "../runtime/compiler/fragments/GroupFragment";
import { RepFragment } from "../runtime/compiler/fragments/RepFragment";
import { ResistanceFragment } from "../runtime/compiler/fragments/ResistanceFragment";
import { DistanceFragment } from "../runtime/compiler/fragments/DistanceFragment";
import { RoundsFragment } from "../runtime/compiler/fragments/RoundsFragment";
import { TimerFragment } from "../runtime/compiler/fragments/TimerFragment";
import { MdTimerParse } from "./timer.parser";
import { ICodeStatement, ParsedCodeStatement } from "../core/models/CodeStatement";

export type GroupType = 'round' | 'compose' | 'repeat';

/**
 * Token metadata from Chevrotain
 */
interface TokenMeta {
  line?: number;
  columnStart?: number;
  columnEnd?: number;
  startOffset?: number;
  endOffset?: number;
}

/**
 * Parser error information
 */
interface SemanticError {
  message: string;
  line?: number;
  column?: number;
  token?: { startOffset?: number; endOffset?: number };
}

const parser = new MdTimerParse() as { getBaseCstVisitorConstructor: () => new () => object };
const BaseCstVisitor = parser.getBaseCstVisitorConstructor() as {
  new(): {
    validateVisitor(): void;
    visit(ctx: unknown, ...args: unknown[]): unknown;
  };
};

export class MdTimerInterpreter extends BaseCstVisitor {
  private semanticErrors: SemanticError[] = [];

  constructor() {
    super();
    // This helper will detect any missing or redundant methods on this visitor
    this.validateVisitor();
  }

  getErrors(): SemanticError[] {
    return this.semanticErrors;
  }

  clearErrors() {
    this.semanticErrors = [];
  }

  private addError(message: string, meta: TokenMeta | undefined) {
    this.semanticErrors.push({
      message,
      line: meta?.line,
      column: meta?.columnStart,
      token: { startOffset: meta?.startOffset, endOffset: meta?.endOffset }
    });
  }

  /// High level entry point, contains any number of simple of compound timers.
  wodMarkdown(ctx: any) {
    try {
      if (!ctx || !Array.isArray(ctx.markdown)) {
        throw new Error("Invalid context: markdown array is required");
      }

      let blocks = ctx.markdown
        .filter((block: any) => block !== null && block !== undefined)
        .flatMap((block: any) => {
          try {
            return this.visit(block) || [];
          } catch (blockError) {
            throw new Error(`Error processing markdown block: ${blockError}`);
          }
        }) as ICodeStatement[];

      // Use temporary map to build parent-child relationships type-safely
      const parentChildMap = new Map<number, number[]>();

      let stack: { columnStart: number; block: ICodeStatement }[] = [];
      for (let block of blocks) {
        stack = stack.filter(
          (item: any) => item.columnStart < block.meta.columnStart
        );

        block.id = block.meta.line;

        if (stack.length > 0) {
          for (let parent of stack) {
            const groupFragments = block.fragments.filter(f => f.fragmentType === FragmentType.Group);
            parent.block.isLeaf = parent.block.isLeaf || groupFragments.length > 0;

            // Store parent-child relationships in temporary map (type-safe)
            if (!parentChildMap.has(parent.block.id)) {
              parentChildMap.set(parent.block.id, []);
            }
            parentChildMap.get(parent.block.id)!.push(block.id);
            block.parent = parent.block.id;
          }
        }

        stack.push({ columnStart: block.meta.columnStart, block });
      }

      // Apply grouped children structure from temporary map
      for (let block of blocks) {
        const flatChildren = parentChildMap.get(block.id) || [];
        block.children = this.groupChildrenByGroupFragments(flatChildren, blocks);
      }

      return blocks;
    } catch (error) {
      throw new Error(`Error in wodMarkdown: ${error instanceof Error ? error.message : String(error)
        }`);
    }
  }

  wodBlock(ctx: any): ICodeStatement[] {
    let statement = new ParsedCodeStatement();
    const groupFragments = ctx.lap && this.visit(ctx.lap);
    statement.fragments.push(...(groupFragments || []));

    const fragmentProducers = [
      ctx.rounds,
      ctx.trend,
      ctx.duration,
      ctx.action,
      ctx.reps,
      ctx.effort,
      ctx.resistance,
      ctx.distance
    ];

    for (const producer of fragmentProducers) {
      if (producer) {
        const visited = this.visit(producer) as ICodeFragment[];
        statement.fragments.push(...visited);
      }
    }

    statement.meta = this.combineMeta(
      statement.fragments.map((fragment: any) => fragment.meta)
    );
    statement.id = statement.meta.line;

    // Group fragment logic  
    // If statement is a child (has parent) and no group fragment, add a repeat GroupFragment
    if (groupFragments?.length === 0 && statement.parent !== undefined) {
      const meta: CodeMetadata = {
        line: statement.meta.line,
        startOffset: statement.meta.startOffset,
        endOffset: statement.meta.startOffset,
        columnStart: statement.meta.columnStart,
        columnEnd: statement.meta.columnStart,
        length: 1,
      };
      statement.fragments.push(new GroupFragment('repeat', "", meta));
    }

    statement.isLeaf = statement.fragments.filter(f => f.fragmentType === FragmentType.Group).length > 0;
    return [statement];
  }

  action(ctx: any): ActionFragment[] {
    const meta = this.getMeta([ctx.ActionOpen[0], ctx.ActionClose[0]]);

    // Collect all tokens inside the action fence and restore ordering by startOffset
    const tokenBuckets = [
      ...(ctx.Identifier || []),
      ...(ctx.AllowedSymbol || []),
      ...(ctx.Minus || []),
    ];

    const sortedTokens = tokenBuckets.sort((a: any, b: any) => a.startOffset - b.startOffset);

    // Build raw text. Keep punctuation tight, insert spaces only between word tokens.
    const raw = sortedTokens.reduce((acc: string, tok: any, idx: number) => {
      const image = tok.image as string;
      const prev = sortedTokens[idx - 1];
      const isWord = /[a-z0-9]/i.test(image);
      const prevIsWord = prev ? /[a-z0-9]/i.test(prev.image) : false;

      if (idx > 0 && isWord && prevIsWord) {
        acc += ' ';
      }

      return acc + image;
    }, '').trim();

    const isPinned = raw.startsWith('!');
    const name = raw.replace(/^!/, '').trim();

    return [new ActionFragment(name, meta, { raw, isPinned, name })];
  }


  lap(ctx: any): GroupFragment[] {
    if (ctx.Plus) {
      const meta = this.getMeta([ctx.Plus[0]]);
      return [new GroupFragment('compose', "+", meta)];
    }

    if (ctx.Minus) {
      const meta = this.getMeta([ctx.Minus[0]]);
      return [new GroupFragment("round", "-", meta)];
    }

    return [];
  }

  trend(ctx: any): IncrementFragment[] {
    const meta = this.getMeta([ctx.Trend[0]]);
    return [new IncrementFragment(ctx.Trend[0].image, meta)];
  }

  reps(ctx: any): RepFragment[] {
    if (ctx.QuestionSymbol) {
      const meta = this.getMeta([ctx.QuestionSymbol[0]]);
      return [new RepFragment(undefined, meta)];
    }
    const meta = this.getMeta([ctx.Number[0]]);
    try {
      const val = ctx.Number[0].image * 1;
      return [new RepFragment(val, meta)];
    } catch (e: any) {
      this.addError(e.message, meta);
      return [];
    }
  }

  duration(ctx: any): TimerFragment[] {
    const forceCountUp = !!ctx.countUpModifier;

    // Handle collectible timer (:?)
    if (ctx.CollectibleTimer) {
      const meta = this.getMeta([ctx.CollectibleTimer[0]]);
      return [new TimerFragment(':?', meta, forceCountUp)];
    }

    // Handle regular timer
    const meta = this.getMeta([ctx.Timer[0]]);
    try {
      return [new TimerFragment(ctx.Timer[0].image, meta, forceCountUp)];
    } catch (e: any) {
      this.addError(e.message, meta);
      return [];
    }
  }

  distance(ctx: any): DistanceFragment[] {
    let load: number | undefined;

    if (ctx.QuestionSymbol) {
      load = undefined;
    } else if (ctx.Number && ctx.Number.length > 0) {
      load = ctx.Number[0].image * 1;
    } else {
      load = 1; // default when no number specified (e.g., "m" = 1m)
    }

    let units = (ctx.Distance && ctx.Distance[0].image) || "";
    let metaTokens = [ctx.QuestionSymbol?.[0] ?? ctx.Number?.[0], ctx.Distance?.[0]].filter(Boolean);
    return [new DistanceFragment(load, units, this.getMeta(metaTokens))];
  }

  resistance(ctx: any): ResistanceFragment[] {
    let load: number | undefined;

    if (ctx.QuestionSymbol) {
      load = undefined;
    } else if (ctx.Number && ctx.Number.length > 0) {
      load = ctx.Number[0].image * 1;
    } else {
      load = 1; // default when no number specified
    }

    let units = (ctx.Weight && ctx.Weight[0].image) || "";
    let metaTokens = [ctx.QuestionSymbol?.[0] ?? ctx.Number?.[0], ctx.Weight?.[0]].filter(Boolean);
    return [new ResistanceFragment(load, units, this.getMeta(metaTokens))];
  }

  labels(ctx: any) {
    return [ctx.label.Map((identifier: any) => identifier.image), ctx.label];
  }

  effort(ctx: any): EffortFragment[] {
    const effort = ctx.Identifier.map(
      (identifier: any) => identifier.image
    ).join(" ");
    const meta = this.getMeta(ctx.Identifier.concat(ctx.Comma || []));
    return [new EffortFragment(effort, meta)];
  }

  rounds(ctx: any): ICodeFragment[] {
    const meta = this.getMeta([ctx.GroupOpen[0], ctx.GroupClose[0]]);

    if (ctx.sequence) {
      const groups = this.visit(ctx.sequence[0]) as number[];

      if (groups.length == 1) {
        return [new RoundsFragment(groups[0], meta)];
      }

      return [
        new RoundsFragment(groups.length, meta),
        ...groups.map((group: number) => new RepFragment(group, meta)),
      ];
    }

    if (ctx.label) {
      const label = ctx.label[0].image;
      return [new RoundsFragment(label, meta)];
    }

    return [];
  }

  sequence(ctx: any): number[] {
    return ctx.Number.map((identifier: any) => identifier.image * 1);
  }

  combineMeta(meta: any[]) {
    if (meta.length == 0) {
      return {
        line: 0,
        startOffset: 0,
        endOffset: 0,
        columnStart: 0,
        columnEnd: 0,
        length: 0,
      };
    }
    const sorted = meta
      .filter((item: any) => item != undefined)
      .map((item: any) => ({ ...item, ...item.meta }))
      .sort((a: any, b: any) => a.startOffset - b.startOffset);
    const columnEnd = sorted[sorted.length - 1].columnEnd;
    const columnStart = sorted[0].columnStart;
    return {
      line: sorted[0].line,
      startOffset: sorted[0].startOffset,
      endOffset: sorted[sorted.length - 1].endOffset,
      columnStart: columnStart,
      columnEnd: columnEnd,
      length: columnEnd - columnStart,
    };
  }

  getMeta(tokens: any[]) {
    const endToken = tokens[tokens.length - 1];
    return {
      line: tokens[0].startLine,
      startOffset: tokens[0].startOffset,
      endOffset: endToken.endOffset,
      columnStart: tokens[0].startColumn,
      columnEnd: endToken.endColumn,
      length: endToken.endColumn - tokens[0].startColumn,
    };
  }

  /**
   * Groups consecutive compose group fragments together while keeping other fragments individual.
   * Implements the grouping algorithm per contracts/visitor-grouping.md
   * Optimized with Map for O(1) block lookups.
   */
  groupChildrenByGroupFragments(childIds: number[], allBlocks: ICodeStatement[]): number[][] {
    if (childIds.length === 0) {
      return [];
    }

    // Create Map for O(1) block lookups instead of O(N) find operations
    const blocksById = new Map(allBlocks.map(b => [b.id, b]));

    const groups: number[][] = [];
    let currentGroup: number[] = [];

    for (let i = 0; i < childIds.length; i++) {
      const childId = childIds[i];
      const childBlock = blocksById.get(childId);
      const groupFragmentType = this.getChildGroupFragmentType(childBlock);

      if (groupFragmentType === 'compose') {
        // Add to current group (compose fragments group consecutively)
        currentGroup.push(childId);
      } else {
        // Finish current compose group if it exists
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
          currentGroup = [];
        }
        // Add non-compose fragment as individual group
        groups.push([childId]);
      }
    }

    // Don't forget the last group if it's a compose group
    if (currentGroup.length > 0) {
      groups.push([...currentGroup]);
    }

    return groups;
  }

  /**
   * Helper method to determine the group fragment type of a child block
   */
  private getChildGroupFragmentType(childBlock: ICodeStatement | undefined): 'compose' | 'round' | 'repeat' {
    if (!childBlock || !childBlock.fragments) {
      return 'repeat'; // Default for blocks without group fragments
    }

    const groupFragment = childBlock.fragments.find(f => f.fragmentType === FragmentType.Group) as GroupFragment;
    if (!groupFragment) {
      return 'repeat'; // No group fragment means repeat type
    }

    return groupFragment.group || 'repeat';
  }
}
