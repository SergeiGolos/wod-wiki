import { ICodeStatement } from "@/core";

export interface IScript {
  source: string;
  statements: ICodeStatement[];
  errors?: any[] | undefined;
  getIds(ids: number[]) : ICodeStatement[];
  getId(id: number): ICodeStatement | undefined;
  getAt(index: number): ICodeStatement | undefined;
}

export class WodScript implements IScript {
  source: string;
  statements: ICodeStatement[];
  errors: any[] | undefined;
  
  // Lazy-initialized Map for O(1) ID lookups
  private _idMap?: Map<number, ICodeStatement>;

  constructor(source: string, statements: ICodeStatement[], errors: any[] = []) {
    this.source = source;
    this.statements = statements;
    this.errors = errors;
  }

  /**
   * Gets the ID-to-statement Map, building it lazily on first access.
   * Provides O(1) lookups instead of O(n) find() calls.
   */
  private getIdMap(): Map<number, ICodeStatement> {
    if (!this._idMap) {
      this._idMap = new Map(this.statements.map(s => [s.id as number, s]));
    }
    return this._idMap;
  }

  /**
   * Resolves multiple statement IDs to statements.
   * Uses cached Map for O(n) performance instead of O(n²).
   */
  getIds(ids: number[]): ICodeStatement[] {
    const idMap = this.getIdMap();
    return ids.map(id => idMap.get(id)).filter(Boolean) as ICodeStatement[];
  }

  /**
   * Resolves a single statement ID to a statement.
   * Uses cached Map for O(1) performance instead of O(n).
   */
  getId(id: number): ICodeStatement | undefined {
    return this.getIdMap().get(id);
  }

  /**
   * Gets a statement by its array index.
   */
  getAt(index: number): ICodeStatement | undefined {
    return this.statements[index];
  }

  /**
   * Flattens grouped children (number[][]) and resolves to statements.
   * Convenience wrapper for getIds(children.flat()).
   */
  getFlatChildren(children: number[][]): ICodeStatement[] {
    return this.getIds(children.flat());
  }

  /**
   * Resolves grouped children while preserving group structure.
   * Maps each number[] group to ICodeStatement[] group.
   */
  getChildGroups(children: number[][]): ICodeStatement[][] {
    return children.map(group => this.getIds(group));
  }
}
