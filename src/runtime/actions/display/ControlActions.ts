import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { RuntimeControlsBehavior } from '../../behaviors/RuntimeControlsBehavior';
import { RuntimeButton } from '../../models/MemoryModels';

export class UpdateDisplayModeAction implements IRuntimeAction {
    readonly type = 'update-display-mode';
    constructor(private readonly mode: 'timer' | 'clock') { }
    do(runtime: IScriptRuntime): void {
        const root = runtime.stack.blocks[runtime.stack.blocks.length - 1]; // Root is at bottom (last in top-first list)
        const controls = root?.getBehavior(RuntimeControlsBehavior);
        if (controls) {
            controls.setDisplayMode(this.mode);
        }
    }
}

export class RegisterButtonAction implements IRuntimeAction {
    readonly type = 'register-button';
    constructor(private readonly button: RuntimeButton) { }
    do(runtime: IScriptRuntime): void {
        const root = runtime.stack.blocks[runtime.stack.blocks.length - 1];
        const controls = root?.getBehavior(RuntimeControlsBehavior);
        if (controls) {
            controls.registerButton(this.button);
        }
    }
}

export class UnregisterButtonAction implements IRuntimeAction {
    readonly type = 'unregister-button';
    constructor(private readonly buttonId: string) { }
    do(runtime: IScriptRuntime): void {
        const root = runtime.stack.blocks[runtime.stack.blocks.length - 1];
        const controls = root?.getBehavior(RuntimeControlsBehavior);
        if (controls) {
            controls.unregisterButton(this.buttonId);
        }
    }
}

export class ClearButtonsAction implements IRuntimeAction {
    readonly type = 'clear-buttons';
    do(runtime: IScriptRuntime): void {
        const root = runtime.stack.blocks[runtime.stack.blocks.length - 1];
        const controls = root?.getBehavior(RuntimeControlsBehavior);
        if (controls) {
            controls.clearButtons();
        }
    }
}
