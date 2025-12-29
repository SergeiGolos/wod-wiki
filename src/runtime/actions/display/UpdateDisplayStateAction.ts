import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { IDisplayStackState, DISPLAY_STACK_STATE_TYPE } from '../../contracts/IDisplayStackState';
import { TypedMemoryReference } from '../../contracts/IMemoryReference';
import { ActionPhase, IPhasedAction } from '../ActionPhase';

/**
 * Action that updates the display stack state.
 * 
 * This action is in the DISPLAY phase, meaning it will execute first
 * before any memory, event, or stack mutations.
 */
export class UpdateDisplayStateAction implements IPhasedAction {
    readonly phase = ActionPhase.DISPLAY;
    private _type = 'update-display-state';

    constructor(
        private updates: Partial<IDisplayStackState>
    ) { }

    get type(): string {
        return this._type;
    }

    /* istanbul ignore next */
    set type(_value: string) {
        throw new Error('Cannot modify readonly property type');
    }

    do(runtime: IScriptRuntime): void {
        const refs = runtime.memory.search({
            type: DISPLAY_STACK_STATE_TYPE,
            id: null,
            ownerId: null,
            visibility: null
        });

        if (refs.length > 0) {
            const ref = refs[0] as TypedMemoryReference<IDisplayStackState>;
            const current = ref.get();
            if (current) {
                ref.set({ ...current, ...this.updates });
            }
        } else {
            // Create if not exists - assuming root owner 'root'
            // If we don't have a reliable root owner ID, we might create it with 'system' or similar.
            runtime.memory.allocate<IDisplayStackState>(
                DISPLAY_STACK_STATE_TYPE,
                'system',
                { ...this.updates },
                'public'
            );
        }
    }
}
