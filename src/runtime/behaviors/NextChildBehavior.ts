import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import type { IMemoryReference } from '../memory';
import { IBehavior } from '../IBehavior';

export class NextChildBehavior implements IBehavior {
  private childGroupsRef?: IMemoryReference<string[][]>;
  private childIndexRef?: IMemoryReference<number>;

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    // Discover pre-allocated memory created by other behaviors; if missing, create minimal defaults
    const childGroupsRefs = runtime.memory.search({ ownerId: block.key.toString(), type: 'children-groups', id: null, visibility: null });
    this.childGroupsRef = childGroupsRefs[0] as any;
    if (!this.childGroupsRef) {
      this.childGroupsRef = runtime.memory.allocate<string[][]>();
      runtime.memory.set(this.childGroupsRef, []);
    }
    const childIndexRefs = runtime.memory.search({ ownerId: block.key.toString(), type: 'child-index', id: null, visibility: null });
    this.childIndexRef = childIndexRefs[0] as any;
    if (!this.childIndexRef) {
      this.childIndexRef = runtime.memory.allocate<number>();
      runtime.memory.set(this.childIndexRef, -1);
    }
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] { return []; }

  hasNextChild(): boolean {
    const groups = this.childGroupsRef?.get() ?? [];
    const idx = this.childIndexRef?.get() ?? -1;
    if (groups.length === 0) return false;
    // Starting state
    if (idx < 0) return true;
    const flatCount = groups.reduce((a, g) => a + g.length, 0);
    return idx < flatCount;
  }

  getNextChild(): IRuntimeBlock | undefined {
    // This behavior returns undefined by default and expects a JIT to compile the next child.
    // The owning block can consult getCurrentChildGroup and manage compilation.
    return undefined;
  }

  advanceToNextChild(): void {
    const idx = this.childIndexRef?.get() ?? -1;
    this.childIndexRef?.set(idx + 1);
  }

  getCurrentChildGroup(): string[] | undefined {
    const groups = this.childGroupsRef?.get() ?? [];
    const idx = this.childIndexRef?.get() ?? -1;
    if (groups.length === 0) return undefined;
    if (idx < 0) return groups[0];
    // Determine which group the current index falls into
    let running = 0;
    for (const group of groups) {
      if (idx < running + group.length) return group;
      running += group.length;
    }
    return undefined;
  }
}
