import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';

/**
 * Action that records a round update on the tracker.
 */
export class TrackRoundAction implements IRuntimeAction {
    private _type = 'track-round';

    constructor(
        private readonly blockId: string,
        private readonly currentRound: number,
        private readonly totalRounds?: number
    ) { }

    get type(): string {
        return this._type;
    }

    /* istanbul ignore next */
    set type(_value: string) {
        throw new Error('Cannot modify readonly property type');
    }

    do(runtime: IScriptRuntime): void {
        if (runtime.tracker) {
            runtime.tracker.recordRound(this.blockId, this.currentRound, this.totalRounds);
        }
    }
}
