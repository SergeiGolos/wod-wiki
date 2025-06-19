import { ICodeStatement } from "./ICodeStatement";

export interface IRuntimeScript {
  source: string;
  statements: ICodeStatement[];
  errors?: any[] | undefined;
};

export class WodRuntimeScript implements IRuntimeScript {
  source: string;
  statements: ICodeStatement[];
  errors: any[] | undefined;

  constructor(source: string, statements: ICodeStatement[], errors: any[] = []) {
    this.source = source;
    this.statements = statements;
    this.errors = errors;
  }
}
