import { IRuntimeBlock } from './IRuntimeBlock';
import { RuntimeMetric } from './RuntimeMetric';
import { BlockKey } from '../BlockKey';

export interface MockRuntimeBlock extends IRuntimeBlock {
    displayName: string;
    description: string;
    blockType: 'Root' | 'Timer' | 'Effort' | 'Group' | 'Completion' | 'Idle';
    depth: number;
}
