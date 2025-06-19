import { ICodeStatement } from "./ICodeStatement";

export interface IScript {
  Source: string;
  Statements: ICodeStatement[];
  errors?: any[] | undefined;
  from(ids: number[], index:number) : ICodeStatement[];
  getId(id: number): ICodeStatement | undefined;
  getAt(index: number): ICodeStatement | undefined;
}

export class WodRuntimeScript implements IScript {
  Source: string;
  Statements: ICodeStatement[];
  errors: any[] | undefined;

  constructor(source: string, statements: ICodeStatement[], errors: any[] = []) {
    this.Source = source;
    this.Statements = statements;
    this.errors = errors;
  }

  from(ids: number[], index: number): ICodeStatement[] {
    throw new Error("Method not implemented.");
  }

  getId(id: number): ICodeStatement | undefined {
    return this.Statements.find(s => s.id === id);
  }

  getAt(index: number): ICodeStatement | undefined {
    return this.Statements[index];
  }
}
