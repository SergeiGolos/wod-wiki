import { CodeMetadata } from "./CodeMetadata";
import { ICodeFragment, FragmentType } from "./CodeFragment";
import { IFragmentSource, FragmentFilter } from "../contracts/IFragmentSource";
import { resolveFragmentPrecedence, ORIGIN_PRECEDENCE } from "../utils/fragmentPrecedence";

export interface ICodeStatement {
  id: number;
  parent?: number;
  children: number[][];
  fragments: ICodeFragment[];
  isLeaf?: boolean;
  meta: CodeMetadata;
  fragmentMeta: Map<ICodeFragment, CodeMetadata>;

  // Semantic hints from dialect processing
  hints?: Set<string>;
}

export abstract class CodeStatement implements ICodeStatement, IFragmentSource {
  abstract id: number;
  abstract parent?: number;
  abstract children: number[][];
  abstract meta: CodeMetadata;
  abstract fragments: ICodeFragment[];
  abstract fragmentMeta: Map<ICodeFragment, CodeMetadata>;
  abstract isLeaf?: boolean;

  // ── IFragmentSource ─────────────────────────────────────────────

  hasFragment(type: FragmentType): boolean {
    return this.fragments.some(f => f.fragmentType === type);
  }

  getDisplayFragments(filter?: FragmentFilter): ICodeFragment[] {
    return resolveFragmentPrecedence([...this.fragments], filter);
  }

  getFragment(type: FragmentType): ICodeFragment | undefined {
    const all = this.getAllFragmentsByType(type);
    return all.length > 0 ? all[0] : undefined;
  }

  getAllFragmentsByType(type: FragmentType): ICodeFragment[] {
    const ofType = this.fragments.filter(f => f.fragmentType === type);
    if (ofType.length === 0) return [];

    // Sort by precedence (highest first = lowest rank number first)
    return [...ofType].sort((a, b) => {
      const rankA = ORIGIN_PRECEDENCE[a.origin ?? 'parser'] ?? 3;
      const rankB = ORIGIN_PRECEDENCE[b.origin ?? 'parser'] ?? 3;
      return rankA - rankB;
    });
  }

  get rawFragments(): ICodeFragment[] {
    return [...this.fragments];
  }
}

export class ParsedCodeStatement extends CodeStatement {
  id: number = 0;
  parent?: number;
  children: number[][] = [];
  meta: CodeMetadata = { line: 0, columnStart: 0, columnEnd: 0, startOffset: 0, endOffset: 0, length: 0, raw: '' } as any;
  fragments: ICodeFragment[] = [];
  fragmentMeta: Map<ICodeFragment, CodeMetadata> = new Map();
  isLeaf?: boolean;
  hints?: Set<string>;

  constructor(init?: Partial<ParsedCodeStatement>) {
    super();
    Object.assign(this, init);
    // Ensure fragmentMeta is initialized if not provided in init
    if (!this.fragmentMeta) {
      this.fragmentMeta = new Map();
    }
  }
}

