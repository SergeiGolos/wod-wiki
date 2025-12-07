import { ICodeFragment, FragmentType } from "../core/models/CodeFragment";
import { CodeMetadata } from "../core/models/CodeMetadata";

export interface ActionFragmentOptions {
  /** Original text inside the action fence (after the colon) */
  raw?: string;
  /** Normalized action name (without leading ! pin marker) */
  name?: string;
  /** Whether the action is pinned ([:!action]) */
  isPinned?: boolean;
}

export class ActionFragment implements ICodeFragment {
  readonly value: string;
  readonly image: string;
  readonly raw: string;
  readonly name: string;
  readonly isPinned: boolean;
  readonly sourceLine?: number;

  constructor(action: string, public meta?: CodeMetadata, options: ActionFragmentOptions = {}) {
    // Preserve backward compatibility: "action" arg is the normalized name when options not provided
    this.raw = options.raw ?? action;
    this.isPinned = options.isPinned ?? this.raw.trim().startsWith('!');
    this.name = options.name ?? (this.raw.trim().replace(/^!/, '') || action);

    this.value = this.name;
    this.image = this.raw;
    this.sourceLine = meta?.line;
  }

  readonly type: string = "action";
  readonly fragmentType = FragmentType.Action;
}
