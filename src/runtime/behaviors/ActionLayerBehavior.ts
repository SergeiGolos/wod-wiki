import { IEvent } from '../contracts/events/IEvent';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { PushActionsAction, PopActionsAction, ActionDescriptor } from '../actions/stack/ActionStackActions';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { ActionFragment } from '../compiler/fragments/ActionFragment';

export function buildActionDescriptorsFromFragments(ownerId: string, fragments: ICodeFragment[][] = [], sourceIds: number[] = []): ActionDescriptor[] {
  const descriptors: ActionDescriptor[] = [];

  fragments.forEach((group, groupIndex) => {
    group.forEach((fragment, fragmentIndex) => {
      if (fragment.fragmentType !== FragmentType.Action) return;
      const action = fragment as ActionFragment;
      const eventName = (action.name || action.value || '').trim() || 'next';
      const raw = (action.raw || action.value || '').trim();

      descriptors.push({
        id: `${ownerId}:action:${eventName}:${groupIndex}-${fragmentIndex}`,
        name: eventName,
        eventName,
        ownerId,
        sourceId: sourceIds[0]?.toString(),
        raw,
        displayLabel: raw || eventName,
        isPinned: !!action.isPinned,
      });
    });
  });

  // Dedupe by eventName while preserving order
  const seen = new Set<string>();
  return descriptors.filter(desc => {
    if (seen.has(desc.eventName)) return false;
    seen.add(desc.eventName);
    return true;
  });
}

export class ActionLayerBehavior implements IRuntimeBehavior {
  private readonly descriptors: ActionDescriptor[];
  private readonly includeDefaultNext: boolean;

  constructor(ownerId: string, fragments: ICodeFragment[][] = [], sourceIds: number[] = [], includeDefaultNext = true) {
    this.descriptors = buildActionDescriptorsFromFragments(ownerId, fragments, sourceIds);
    this.includeDefaultNext = includeDefaultNext;
  }

  onPush(_runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    const actions = this.withDefaults(block.key.toString());
    return [new PushActionsAction(block.key.toString(), actions)];
  }

  onPop(_runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    return [new PopActionsAction(block.key.toString())];
  }

  // Fallback: if a custom action event is received and the block has no other
  // handlers for it, advance to next. We avoid 'next' to prevent double-handling
  // because RuntimeBlock already registers a next handler.
  onEvent(event: IEvent, runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (!event?.name) return [];
    if (event.name === 'next') return [];
    const matchesDescriptor = this.descriptors.some(d => d.eventName === event.name);
    if (!matchesDescriptor) return [];

    // Only allow if this block is current
    if (runtime.stack.current !== block) return [];

    return block.next(runtime);
  }

  private withDefaults(ownerId: string): ActionDescriptor[] {
    const actions = [...this.descriptors];
    const hasNext = actions.some(a => a.eventName === 'next');

    if (this.includeDefaultNext && !hasNext) {
      actions.push({
        id: `${ownerId}:action:next:default`,
        name: 'next',
        eventName: 'next',
        ownerId,
        displayLabel: 'Next',
        isPinned: false,
      });
    }

    return actions;
  }
}