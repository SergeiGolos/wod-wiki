import { ICodeFragment } from "../core/models/CodeFragment";

/**
 * Describes a strategy for distributing fragments across repeated block runs.
 * Example: a rounds block can duplicate its fragments per round so runtime
 * recordings land in the correct iteration bucket.
 */
export interface IDistributedFragments {
  distribute(base: ICodeFragment[], blockType?: string): ICodeFragment[][];
}

/**
 * Default passthrough distributor: keeps a single fragment group.
 */
export class PassthroughFragmentDistributor implements IDistributedFragments {
  distribute(base: ICodeFragment[], _blockType?: string): ICodeFragment[][] {
    return [base];
  }
}