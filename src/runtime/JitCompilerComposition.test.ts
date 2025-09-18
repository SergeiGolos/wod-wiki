
import { describe, it, expect } from 'vitest';
import { JitCompiler, RuntimeJitStrategies } from './JitCompiler';
import { compilers, parseWodLine } from './FragmentCompilationManager.fixture';
import { IScriptRuntime } from './IScriptRuntime';  
import { RuntimeStack } from './RuntimeStack';
import { FragmentCompilationManager } from './FragmentCompilationManager';
import { CountdownStrategy, EffortStrategy, BoundedLoopingStrategy } from './strategies';
import { WodScript } from '../WodScript';

describe('JitCompiler with Block Composition', () => {
    it('should compile a child block and inherit metrics from its parent on the stack', () => {
        
        const script = `(21-15-9)
  Thrusters`;

        const parsedScript = parseWodLine(script);        
        const runtime: IScriptRuntime = {
            stack: new RuntimeStack(),
            // Mock other necessary properties and methods of IScriptRuntime
        } as IScriptRuntime;
        const fragmentCompiler = new FragmentCompilationManager(compilers);
        const strategyManager = new RuntimeJitStrategies()
            .addStrategy(new CountdownStrategy())
            .addStrategy(new BoundedLoopingStrategy())
            .addStrategy(new EffortStrategy());

        const compiler = new JitCompiler(new WodScript(script, parsedScript), fragmentCompiler, strategyManager);
        const parent = compiler.compile([parsedScript[0]], runtime);

        runtime.stack.push(parent!);

        const child = compiler.compile([parsedScript[1]], runtime);
        runtime.stack.push(child!);
    });
});
