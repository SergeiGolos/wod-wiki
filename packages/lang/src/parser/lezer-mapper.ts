import type { Tree } from '@lezer/common';
import type { ICodeStatement } from '@wod-wiki/core';
import { classifyStatements } from './semantic-classifier';
import { extractSyntaxFacts } from './syntax-parser';
import { dialectStack } from '../dialects/DialectStack';

export type SourceInput = string | { tree?: Tree; source: string; doc?: { toString(): string } } | { doc: { toString(): string } };

/**
 * Extract statements WITHOUT running the Dialect Stack.
 *
 * Used by the parser test harness (which applies its own Dialect set) and by
 * any consumer that needs the raw classified statements before Dialect
 * processing. Production consumers should use {@link extractStatements}.
 */
export function extractStatementsRaw(sourceOrTree: SourceInput, treeArg?: Tree): ICodeStatement[] {
  let source: string;
  let tree: Tree | undefined = treeArg;

  if (typeof sourceOrTree === 'string') {
    source = sourceOrTree;
  } else if ('source' in sourceOrTree) {
    source = sourceOrTree.source;
    tree = tree ?? sourceOrTree.tree;
  } else if ('doc' in sourceOrTree) {
    source = sourceOrTree.doc.toString();
  } else {
    source = '';
  }

  const facts = extractSyntaxFacts(source, tree);
  return classifyStatements(facts);
}

/**
 * Extracts WhiteboardScript statements from source or Lezer tree.
 *
 * The Dialect Stack (base Units + sport Dialects + personal-overrides) runs on
 * every statement here, so every parse consumer gets fused units and sport
 * hints uniformly. See `DialectStack.ts`.
 *
 * @param sport - The block's `:sport` fence suffix (` ```log:climbing `).
 *   Omitted → the full registry stack runs. See {@link DialectStack.dialectsFor}.
 */
export function extractStatements(
  sourceOrTree: SourceInput,
  sportOrTree?: string | Tree,
  sportArg?: string
): ICodeStatement[] {
  let sport: string | undefined;
  let tree: Tree | undefined;

  if (typeof sportOrTree === 'string') {
    sport = sportOrTree;
  } else if (sportOrTree && typeof sportOrTree === 'object') {
    tree = sportOrTree as Tree;
    sport = sportArg;
  }

  const statements = extractStatementsRaw(sourceOrTree, tree);
  dialectStack.processAll(statements, sport);
  return statements;
}
