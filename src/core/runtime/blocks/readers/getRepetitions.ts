import { ICodeStatement } from "@/core/CodeStatement";
import { RepFragment } from "@/core/fragments/RepFragment";

export function getRepetitions(node: ICodeStatement): RepFragment[] {
  const fragments = node.fragments
    .filter(f => f.type === 'reps')
    .map(f => f as RepFragment);

  return fragments;
}
