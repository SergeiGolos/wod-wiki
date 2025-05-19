import { CodeMetadata } from "./CodeMetadata";
import { ICodeStatement } from "./CodeStatement";
import { DistanceFragment } from "./fragments/DistanceFragment";
import { EffortFragment } from "./fragments/EffortFragment";
import { RepFragment } from "./fragments/RepFragment";
import { ResistanceFragment } from "./fragments/ResistanceFragment";
import { RoundsFragment } from "./fragments/RoundsFragment";
import { getDistance } from "./runtime/blocks/readers/getDistance";
import { getDuration } from "./runtime/blocks/readers/getDuration";
import { getEffort } from "./runtime/blocks/readers/getEffort";
import { getResistance } from "./runtime/blocks/readers/getResistance";
import { getRepetitions } from "./runtime/blocks/readers/getRepetitions";
import { getRounds } from "./runtime/blocks/readers/getRounds";
import { Duration } from "./Duration";
import { CodeFragment } from "./CodeFragment";
import { ZeroIndexMeta } from "./ZeroIndexMeta";


export class JitStatement implements ICodeStatement {
  constructor(public node: ICodeStatement) {
    this.id = node?.id ?? -1;
    this.parent = node?.parent;
    this.children = node?.children ?? [];
    this.meta = node?.meta ?? new ZeroIndexMeta();
    this.fragments = node?.fragments ?? [];
  }

  public id: number;
  public parent?: number;
  public children: number[] = [];
  public meta: CodeMetadata = new ZeroIndexMeta();
  public fragments: CodeFragment[] = [];

  public durations(): Duration[] {
    return getDuration(this);
  }
  public duration(index:number): Duration {
    const durations = getDuration(this);
    if (durations.length == 0) {
      return new Duration(undefined);
    }
    return durations[index % durations.length];
  }

  public repetition(index:number): RepFragment | undefined {
    const reps = getRepetitions(this);
    if (reps.length == 0) {
      return undefined;
    }
    return reps[index % reps.length];
  }

  public repetitions(): RepFragment[] {
    return getRepetitions(this);
  }

  public resistances(): ResistanceFragment[] {
    return getResistance(this);
  }
  public resistance(index:number): ResistanceFragment | undefined {
    const resistances = getResistance(this);
    if (resistances.length == 0) {
      return undefined;
    }
    return resistances[index % resistances.length];
  }

  public distances(): DistanceFragment[] {
    return getDistance(this);
  }
  public distance(index:number): DistanceFragment | undefined {
    const distances = getDistance(this);
    if (distances.length == 0) {
      return undefined;
    }
    return distances[index % distances.length];
  }

  public efforts(): EffortFragment[] {
    return getEffort(this);
  }
  public effort(index:number): EffortFragment | undefined {
    const efforts = getEffort(this);
    if (efforts.length == 0) {
      return undefined;
    }
    return efforts[index % efforts.length];
  }

  public rounds(): RoundsFragment[] {
    return getRounds(this);
  }
  public round(index:number): RoundsFragment | undefined {
    const rounds = getRounds(this);
    if (rounds.length == 0) {
      return undefined;
    }
    return rounds[index % rounds.length];
  }
}
