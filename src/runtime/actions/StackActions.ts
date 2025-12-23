import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { MemoryTypeEnum } from '../MemoryTypeEnum';

export class PushStackItemAction implements IRuntimeAction {
    readonly type = 'push-stack-item';

    constructor(private readonly blockId: string) { }

    do(runtime: IScriptRuntime): void {
        const stackRef = runtime.memory.allocate<string[]>(
            MemoryTypeEnum.DISPLAY_STACK_STATE,
            'runtime',
            [],
            'public'
        );

        const stack = stackRef.get() || [];
        if (!stack.includes(this.blockId)) {
            stack.push(this.blockId);
            stackRef.set([...stack]);

        }
    }
}

export class PopStackItemAction implements IRuntimeAction {
    readonly type = 'pop-stack-item';

    constructor(private readonly blockId: string) { }

    do(runtime: IScriptRuntime): void {
        const stackRef = runtime.memory.allocate<string[]>(
            MemoryTypeEnum.DISPLAY_STACK_STATE,
            'runtime',
            [],
            'public'
        );

        const stack = stackRef.get() || [];
        const index = stack.indexOf(this.blockId);
        if (index !== -1) {
            stack.splice(index, 1);
            stackRef.set([...stack]);

        }
    }
}
