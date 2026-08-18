import type { ICodeStatement } from '../../core/models/CodeStatement';
import type { IRuntimeBlock } from './IRuntimeBlock';
import type { IRuntimeActionable } from './primitives/IRuntimeActionable';

export interface IJitCompiler {
  compile(nodes: ICodeStatement[], runtime: IRuntimeActionable): IRuntimeBlock | undefined;
}
