export interface SourceCodeMetadata {
  line: number;
  startOffset: number;
  endOffset: number;
  columnStart: number;
  columnEnd: number;
  length: number;
}

export class SourceDisplayBlock implements DisplayBlock {
  constructor(
    internal: StatementBlock,
    public lookup: (id: number) => StatementBlock
  ) {
    this.id = internal.id;
    this.depth = internal.parents?.length || 0;
    this.block = internal;
    this.round = 0;
    this.timestamps = [];
    this.duration = 0;
    if (internal.children?.length == 0) {
      const blockChain = [internal.id, ...(internal?.parents || [])];
      let inheritedDuration = 0;

      for (const id of blockChain) {
        const currentBlock = lookup(id);
        const fragment = currentBlock?.fragments?.find(
          (f) => f.type === "duration"
        ) as TimerFragment;
        if (Math.abs(fragment?.duration || 0) > 0) {
          inheritedDuration = fragment?.duration || 0;
          break;
        }
      }
      this.duration = inheritedDuration;
    }
  }

  timestamps: Timestamp[];
  duration: number;
  parent?: StatementBlock | undefined;
  id: number;
  depth: number;
  block: StatementBlock;
  round: number;
  status?: string | undefined;

  startRound() {
    this.round += 1;
    
    //if this.parents?.length > 0 {
    //  foreach
  }

  getFragment(type: string) : StatementFragment | undefined {
    return this.block?.fragments.find((fragment: StatementFragment) =>
        fragment.type === type
    );
  }

  getParts(filter: string[] = []) {
    return this.block?.fragments
      .filter(
        (fragment: StatementFragment) =>
          fragment.toPart !== undefined && !filter.includes(fragment.type)
      )
      .map((fragment: StatementFragment) => {
        return fragment.toPart();
      });
  }
}

export interface DisplayBlock {
  block: StatementBlock;
  timestamps: Timestamp[];
  duration: number;
  parent?: StatementBlock;
  id: number;
  depth: number;
  round: number;
  status?: string;
  
  startRound : () => void;
  getFragment : (type: string) => StatementFragment | undefined;
  getParts: (filter?: string[]) => string[];
} 

export interface StatementFragment {
  type: string;
  meta: SourceCodeMetadata;
  toPart: () => string;
}

export interface TimerFragment extends StatementFragment {
  duration: number;
}

export interface RoundsFragment extends StatementFragment {
  count: number;
}

export interface ResistanceFragment extends StatementFragment {
  units: string;
  value: string;
}

export interface EffortFragment extends StatementFragment {
  effort: string;
}

export interface RepFragment extends StatementFragment {
  reps?: number;
}

export interface TextFragment extends StatementFragment {
  text: string;
  level?: string;
}

export interface StatementBlock {
  id: number;
  parents: number[];
  children: number[];
  type: string;
  meta: SourceCodeMetadata;
  fragments: StatementFragment[];
}

export interface Timestamp {
  start: Date;
  stop?: Date;
  label?: string;
}
