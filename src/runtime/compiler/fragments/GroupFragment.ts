import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { CodeMetadata } from "../../../core/models/CodeMetadata";
import { GroupType } from "../../../parser/timer.visitor";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class GroupFragment implements ICodeFragment {
    readonly value: GroupType;
    readonly origin: FragmentOrigin = 'parser';

    constructor(public group: GroupType, public image: string, public meta?: CodeMetadata) {
        this.value = group;
    }
    readonly type: string = "group";
    readonly fragmentType = FragmentType.Group;
    readonly behavior: MetricBehavior = MetricBehavior.Defined;
}

