import { ICodeStatement } from "./CodeStatement";

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

  constructor(source: string, statements: ICodeStatement[], errors: any[] = []) {
    this.source = source;
    this.statements = statements;
    this.errors = errors;
  }

  getIds(ids: number[] | string[]): ICodeStatement[] {
    return ids.map(id => this.getId(id)).filter(Boolean) as ICodeStatement[];
  }

  getId(id: number | string): ICodeStatement | undefined {
    return this.statements.find(s => s.id.toString() === id.toString());
  }

  getAt(index: number): ICodeStatement | undefined {
    return this.statements[index];
  }
}
