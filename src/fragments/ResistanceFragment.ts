import { ICodeFragment, FragmentType, FragmentCollectionState } from "../core/models/CodeFragment";
import { CodeMetadata } from "../core/models/CodeMetadata";

export class ResistanceFragment implements ICodeFragment {
  readonly value: { amount: number | undefined, units: string };
  readonly image: string;
  readonly collectionState: FragmentCollectionState;

  constructor(value: number | undefined, public units: string, public meta?: CodeMetadata) {
    this.value = { amount: value, units: units };
    this.image = value !== undefined ? `${value} ${units}` : `? ${units}`;
    // If value is undefined, this is a collectible fragment
    this.collectionState = value === undefined 
      ? FragmentCollectionState.UserCollected 
      : FragmentCollectionState.Defined;
  }
  readonly type: string = "resistance";
  readonly fragmentType = FragmentType.Resistance;
}
