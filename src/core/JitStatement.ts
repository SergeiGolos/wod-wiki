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
import { IncrementFragment } from "./fragments/IncrementFragment";
import { getIncrement } from "./runtime/blocks/readers/getIncrement";
import { BlockKey } from "./BlockKey";


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
  public duration(blockKey: BlockKey): Duration {
    const durations = this.durations();
    if (durations.length == 0) {
      return new Duration(undefined);
    }
    return durations[blockKey.index % durations.length];
  }

  public increments(): IncrementFragment[] {
    return getIncrement(this);
  }
  public increment(blockKey: BlockKey | number): IncrementFragment | undefined {
    const increments = this.increments();
    if (increments.length == 0) {
      return undefined;
    }
    return increments[blockKey instanceof BlockKey ? blockKey.index : blockKey % increments.length];
  }

  public repetitions(): RepFragment[] {
    return getRepetitions(this);
  }
  public repetition(blockKey: BlockKey | number): RepFragment | undefined {
    const reps = this.repetitions();
    if (reps.length == 0) {
      return undefined;
    }
    return reps[blockKey instanceof BlockKey ? blockKey.index : blockKey % reps.length];
  }
 

  public resistances(): ResistanceFragment[] {
    return getResistance(this);
  }
  
  public resistance(blockKey: BlockKey | number): ResistanceFragment | undefined {
    const resistances = this.resistances();
    if (resistances.length == 0) {
      return undefined;
    }
    return resistances[blockKey instanceof BlockKey ? blockKey.index : blockKey % resistances.length];
  }

  public distances(): DistanceFragment[] {
    return getDistance(this);
  }
  public distance(blockKey: BlockKey | number): DistanceFragment | undefined {
    const distances = this.distances();
    if (distances.length == 0) {
      return undefined;
    }
    return distances[blockKey instanceof BlockKey ? blockKey.index : blockKey % distances.length];
  }

  public efforts(): EffortFragment[] {
    return getEffort(this);
  }
  public effort(blockKey: BlockKey | number): EffortFragment | undefined {
    const efforts = this.efforts();
    if (efforts.length == 0) {
      return undefined;
    }
    return efforts[blockKey instanceof BlockKey ? blockKey.index : blockKey % efforts.length];
  }

  public rounds(): RoundsFragment[] {
    return getRounds(this);
  }
  public round(blockKey: BlockKey | number): RoundsFragment | undefined {
    const rounds = this.rounds();
    if (rounds.length == 0) {
      return undefined;
    }
    return rounds[blockKey instanceof BlockKey ? blockKey.index : blockKey % rounds.length];
  }
}
