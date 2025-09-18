import type { IMemoryReference } from '../memory';
import { IRuntimeLog } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IAllocateSpanBehavior } from './IAllocateSpanBehavior';
import { IResultSpanBuilder } from '../ResultSpanBuilder';

export class AllocateSpanBehavior implements IAllocateSpanBehavior {
  private spanRef?: IMemoryReference<IResultSpanBuilder>;
  private defaultVisibility: 'public' | 'private' = 'private';

  constructor(opts?: {
    visibility?: 'public' | 'private';
    initial?: IResultSpanBuilder;
    factory?: (runtime: IScriptRuntime, block: IRuntimeBlock) => IResultSpanBuilder;
  }) {
    if (opts?.visibility) this.defaultVisibility = opts.visibility;
    if (opts?.initial) this._initial = opts.initial;
    if (opts?.factory) this._factory = opts.factory;
  }

  private _initial?: IResultSpanBuilder;
  private _factory?: (runtime: IScriptRuntime, block: IRuntimeBlock) => IResultSpanBuilder;

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[] {
    const span = this._factory ? this._factory(runtime, block) : (this._initial ?? this.createSpan(block.key.toString()));
    this.spanRef = runtime.memory.allocate<IResultSpanBuilder>('span-root', block.key.toString(), span, undefined, this.defaultVisibility);
    return [];
  }
  onNext(): IRuntimeLog[] { return []; }
  onPop(): IRuntimeLog[] { return []; }

  getSpan(): IResultSpanBuilder | undefined { return this.spanRef?.get(); }
  setSpan(span: IResultSpanBuilder): void { this.spanRef?.set(span); }
  createSpan(blockKey?: string): IResultSpanBuilder {
    return {
      create: () => ({ blockKey: blockKey ?? '', timeSpan: {}, metrics: [], duration: 0 }),
      getSpans: () => [],
      close: () => void 0,
      start: () => void 0,
      stop: () => void 0,
    };
  }
  getSpanReference(): IMemoryReference<IResultSpanBuilder> | undefined { return this.spanRef; }
  initializeSpan(visibility: 'public' | 'private'): void { this.defaultVisibility = visibility; }
}
