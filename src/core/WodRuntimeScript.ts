import { ICodeStatement } from "./CodeStatement";


export type WodRuntimeScript = {
  source: string;
  statements: ICodeStatement[];
  errors: any[];
};
