import { CodeMetadata } from "./CodeMetadata";
import { ICodeFragment, FragmentType } from "./CodeFragment";
export interface ICodeStatement {  
  id: number;
  parent?: number;
  children: number[][];
  fragments: ICodeFragment[];
  isLeaf?: boolean;
  meta: CodeMetadata;
  
  // Semantic hints from dialect processing
  hints?: Set<string>;

  /**
   * Find the first fragment of a given type, optionally matching a predicate.
   */
  findFragment<T extends ICodeFragment = ICodeFragment>(
    type: FragmentType,
    predicate?: (f: ICodeFragment) => boolean
  ): T | undefined;

  /**
   * Get all fragments of a given type.
   */
  filterFragments<T extends ICodeFragment = ICodeFragment>(
    type: FragmentType
  ): T[];

  /**
   * Check if a fragment of a given type exists.
   */
  hasFragment(type: FragmentType): boolean;
}

export abstract class CodeStatement implements ICodeStatement {
  abstract id: number;
  abstract parent?: number;
  abstract children: number[][];
  abstract meta: CodeMetadata;
  abstract fragments: ICodeFragment[];
  abstract isLeaf?: boolean;

  findFragment<T extends ICodeFragment = ICodeFragment>(
    type: FragmentType,
    predicate?: (f: ICodeFragment) => boolean
  ): T | undefined {
    return this.fragments.find(
      f => f.fragmentType === type && (!predicate || predicate(f))
    ) as T | undefined;
  }

  filterFragments<T extends ICodeFragment = ICodeFragment>(
    type: FragmentType
  ): T[] {
    return this.fragments.filter(f => f.fragmentType === type) as T[];
  }

  hasFragment(type: FragmentType): boolean {
    return this.fragments.some(f => f.fragmentType === type);
  }
}

export class ParsedCodeStatement extends CodeStatement {
  id: number = 0;
  parent?: number;
  children: number[][] = [];
  meta: CodeMetadata = { line: 0, columnStart: 0, columnEnd: 0, startOffset: 0, endOffset: 0, length: 0, raw: '' } as any;
  fragments: ICodeFragment[] = [];
  isLeaf?: boolean;
  hints?: Set<string>;

  constructor(init?: Partial<ParsedCodeStatement>) {
    super();
    Object.assign(this, init);
  }
}

