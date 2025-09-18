import { ScriptRuntime } from "../ScriptRuntime";
import { RuntimeBlock } from '../RuntimeBlock';
import { WodScript } from '../../WodScript';
import { JitCompiler } from '../JitCompiler';
import { BlockKey } from '../../BlockKey';
import { EventHandler, IRuntimeEvent } from '../EventHandler';
import { IResultSpanBuilder } from '../ResultSpanBuilder';
import { RuntimeMetric } from '../RuntimeMetric';
import { IMetricInheritance } from '../IMetricInheritance';

/**
 * Example block that demonstrates memory separation by storing its state in memory
 * instead of as class properties.
 */
class ExerciseBlock extends RuntimeBlock {
    key = 'exercise';
    spans = {} as IResultSpanBuilder;
    handlers: EventHandler[] = [];
    metrics: RuntimeMetric[] = [];
    parent?: import("./IRuntimeBlock").IRuntimeBlock | undefined;

    private _initialized = false;

    constructor(private exerciseName: string, private targetReps: number) {
        super();
    }

    tick(): IRuntimeEvent[] {
        // Initialize memory on first tick
        if (!this._initialized) {
            this.initializeMemory();
            this._initialized = true;
        }

        // Get state from memory instead of class properties
        const stateRef = this.getMemory<ExerciseState>('exercise-state')!;
        const state = stateRef.get()!;

        console.log(`🏃 ExerciseBlock.tick() - ${state.name}: ${state.completedReps}/${state.targetReps} reps`);

        // Simulate completing a rep
        if (state.completedReps < state.targetReps) {
            state.completedReps++;
            stateRef.set(state);
        }

        return [];
    }

    isDone(): boolean {
        const stateRef = this.getMemory<ExerciseState>('exercise-state');
        if (!stateRef) return false;
        
        const state = stateRef.get();
        return state ? state.completedReps >= state.targetReps : false;
    }

    reset(): void {
        const stateRef = this.getMemory<ExerciseState>('exercise-state');
        if (stateRef) {
            const state = stateRef.get()!;
            state.completedReps = 0;
            stateRef.set(state);
            console.log(`🔄 ExerciseBlock.reset() - Reset ${state.name} to 0 reps`);
        }
    }

    inherit(): IMetricInheritance[] {
        return [];
    }

    private initializeMemory(): void {
        // Store exercise state in memory instead of as class properties
        const initialState: ExerciseState = {
            name: this.exerciseName,
            targetReps: this.targetReps,
            completedReps: 0,
            startTime: Date.now()
        };

        this.allocateMemory<ExerciseState>('exercise-state', initialState);

        // Also allocate some metadata
        const metadata = this.allocateMemory<ExerciseMetadata>('metadata', {
            blockId: this.key.toString(),
            createdAt: Date.now(),
            version: '1.0'
        });

        // Create a child reference for tracking performance
        const performanceRef = metadata.createChild<PerformanceData>('performance', {
            tickCount: 0,
            lastUpdateTime: Date.now()
        });

        console.log(`🧠 ExerciseBlock.initializeMemory() - Allocated memory for ${this.exerciseName}`);
    }

    onMemoryCleanup(): void {
        const stateRef = this.getMemory<ExerciseState>('exercise-state');
        if (stateRef) {
            const state = stateRef.get();
            console.log(`🧹 ExerciseBlock.onMemoryCleanup() - Cleaning up ${state?.name} (${state?.completedReps}/${state?.targetReps} reps completed)`);
        }
    }
}

interface ExerciseState {
    name: string;
    targetReps: number;
    completedReps: number;
    startTime: number;
}

interface ExerciseMetadata {
    blockId: string;
    createdAt: number;
    version: string;
}

interface PerformanceData {
    tickCount: number;
    lastUpdateTime: number;
}

/**
 * Demonstrates the memory separation functionality
 */
export function demonstrateMemorySeparation(): void {
    console.log('\n🧠 === Memory Separation Demonstration ===\n');

    // Create runtime with memory separation
    const mockScript = {} as WodScript;
    const mockCompiler = {} as JitCompiler;
    const runtime = new ScriptRuntime(mockScript, mockCompiler);
    runtime.initialize();

    console.log('1. Creating exercise blocks...');
    
    // Create some exercise blocks
    const pushUpBlock = new ExerciseBlock('Push-ups', 10);
    const squatBlock = new ExerciseBlock('Squats', 15);

    // Add blocks to runtime stack
    runtime.stack.push(pushUpBlock);
    runtime.stack.push(squatBlock);

    console.log('\n2. Running some ticks to populate memory...');
    
    // Run some ticks to populate memory
    for (let i = 0; i < 5; i++) {
        pushUpBlock.tick();
        squatBlock.tick();
    }

    console.log('\n3. Independent memory inspection (debugging view):');
    
    // Demonstrate independent memory inspection
    const snapshot = runtime.getMemorySnapshot();
    console.log(`📊 Total memory allocations: ${snapshot.totalAllocated}`);
    console.log(`📋 Memory by type:`, snapshot.summary.byType);
    console.log(`👤 Memory by owner:`, snapshot.summary.byOwner);

    // Inspect specific memory entries
    console.log('\n4. Detailed memory inspection:');
    const exerciseStateEntries = runtime.debugMemory.getByType('exercise-state');
    for (const entry of exerciseStateEntries) {
        console.log(`🏋️ Exercise State [${entry.id}]:`, entry.value);
    }

    // Show memory hierarchy
    console.log('\n5. Memory hierarchy:');
    const hierarchy = runtime.getMemoryHierarchy();
    for (const root of hierarchy.roots) {
        console.log(`📁 Root: ${root.entry.type} [${root.entry.id}]`);
        for (const child of root.children) {
            console.log(`  📄 Child: ${child.entry.type} [${child.entry.id}]`);
        }
    }

    console.log('\n6. Popping blocks and observing automatic cleanup:');
    
    // Pop blocks to demonstrate automatic memory cleanup
    const poppedSquats = runtime.stack.pop();
    console.log(`📤 Popped: ${poppedSquats?.key.toString()}`);

    const poppedPushUps = runtime.stack.pop();
    console.log(`📤 Popped: ${poppedPushUps?.key.toString()}`);

    // Show memory is cleaned up
    console.log('\n7. Memory after cleanup:');
    const finalSnapshot = runtime.getMemorySnapshot();
    console.log(`📊 Final memory allocations: ${finalSnapshot.totalAllocated}`);
    console.log(`📋 Final memory by type:`, finalSnapshot.summary.byType);

    console.log('\n🧠 === Demonstration Complete ===\n');
    
    // Summary
    console.log('Key Benefits Demonstrated:');
    console.log('✅ Execution state (stack) is separate from runtime state (memory)');
    console.log('✅ Memory can be inspected independently without affecting execution');
    console.log('✅ Automatic memory cleanup when blocks are removed from stack');
    console.log('✅ Child processes (blocks) are aware of their execution state through memory');
    console.log('✅ Debugging tools can view memory hierarchy and relationships');
}

// Run the demonstration if this file is executed directly
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    demonstrateMemorySeparation();
}