import { ICodeStatement } from "./ICodeStatement";

export interface IRuntimeScript {
  source: string;
  statements: ICodeStatement[];
  errors: any[];
};

export class WodRuntimeScript implements IRuntimeScript {
  source: string;
  statements: ICodeStatement[];
  errors: any[];

  constructor(source: string, statements: ICodeStatement[], errors: any[] = []) {
    this.source = source;
    this.statements = statements;
    this.errors = errors;
  }
}
