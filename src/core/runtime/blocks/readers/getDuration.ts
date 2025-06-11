import { Duration } from "@/core/types/Duration";
import { IDuration } from "@/core/IDuration";
import { ICodeStatement } from "@/core/ICodeStatement";
import { getTimer } from "./getTimer";

export function getDuration(node: ICodeStatement): IDuration[] {
  const fragments = getTimer(node);
  return fragments.map(f => new Duration(f.original));
}