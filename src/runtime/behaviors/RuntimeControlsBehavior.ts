import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { RuntimeButton, RuntimeControls } from '../models/MemoryModels';
import { TypedMemoryReference } from '../IMemoryReference';

export class RuntimeControlsBehavior implements IRuntimeBehavior {
    private controlsRef?: TypedMemoryReference<RuntimeControls>;
    private buttons: RuntimeButton[] = [];
    private displayMode: 'timer' | 'clock' = 'timer';

    onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        // Allocate controls memory
        this.controlsRef = runtime.memory.allocate<RuntimeControls>(
            'runtime-controls',
            block.key.toString(),
            { buttons: [], displayMode: this.displayMode },
            'public'
        );
        this.updateMemory();
        return [];
    }

    registerButton(button: RuntimeButton): void {
        // Remove existing button with same ID if any
        this.buttons = this.buttons.filter(b => b.id !== button.id);
        this.buttons.push(button);
        this.updateMemory();
    }

    unregisterButton(buttonId: string): void {
        this.buttons = this.buttons.filter(b => b.id !== buttonId);
        this.updateMemory();
    }

    clearButtons(): void {
        this.buttons = [];
        this.updateMemory();
    }

    setDisplayMode(mode: 'timer' | 'clock'): void {
        this.displayMode = mode;
        this.updateMemory();
    }

    private updateMemory(): void {
        if (this.controlsRef) {
            this.controlsRef.set({ 
                buttons: [...this.buttons],
                displayMode: this.displayMode
            });
        }
    }
}
