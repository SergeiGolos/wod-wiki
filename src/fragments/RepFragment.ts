import { ICodeFragment, FragmentType, FragmentCollectionState } from "../core/models/CodeFragment";
import { CodeMetadata } from "../core/models/CodeMetadata";

export class RepFragment implements ICodeFragment {
  readonly value?: number;
  readonly image: string;
  readonly collectionState: FragmentCollectionState;

  constructor(public reps?: number, public meta?: CodeMetadata) { 
    this.value = reps;
    this.image = reps !== undefined ? reps.toString() : '?';
    // If reps is undefined, this is a collectible fragment
    this.collectionState = reps === undefined 
      ? FragmentCollectionState.UserCollected 
      : FragmentCollectionState.Defined;
  }
  readonly type: string = "rep";
  readonly fragmentType = FragmentType.Rep;
}
