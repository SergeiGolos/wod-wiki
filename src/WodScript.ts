import { ICodeStatement } from "./CodeStatement";

export interface IScript {
  source: string;
  statements: ICodeStatement[];
  errors?: any[] | undefined;
  from(ids: number[], index:number) : ICodeStatement[];
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

  from(ids: number[], index: number): ICodeStatement[] {
    throw new Error("Method not implemented.");
  }

  getId(id: number): ICodeStatement | undefined {
    return this.statements.find(s => s.id === id);
  }

  getAt(index: number): ICodeStatement | undefined {
    return this.statements[index];
  }
}
