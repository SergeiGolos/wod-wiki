import { describe, it, expect } from 'vitest';
import { RuntimeMemory } from './RuntimeMemory';

describe('Memory Separation Demonstration', () => {
    it('should demonstrate memory separation capabilities', () => {
        console.log('\n🧠 === Memory Separation Demonstration ===\n');
        
        const memory = new RuntimeMemory();
        
        // 1. Allocate memory for different "blocks" (simulating stack items)
        console.log('1. Allocating memory for different runtime blocks...');
        
        const blockAMemory = memory.allocate<{ name: string; reps: number }>('exercise-state', 
            { name: 'Push-ups', reps: 0 }, 'blockA');
        
        const blockBMemory = memory.allocate<{ name: string; reps: number }>('exercise-state',
            { name: 'Squats', reps: 0 }, 'blockB');
        
        // 2. Create child memory allocations
        console.log('2. Creating child memory allocations...');
        
        const blockAMetadata = blockAMemory.createChild<{ startTime: number }>('metadata', 
            { startTime: Date.now() });
        
        const blockBMetadata = blockBMemory.createChild<{ startTime: number }>('metadata',
            { startTime: Date.now() });
        
        // 3. Simulate some state changes
        console.log('3. Simulating state changes...');
        
        const stateA = blockAMemory.get()!;
        stateA.reps = 5;
        blockAMemory.set(stateA);
        
        const stateB = blockBMemory.get()!;
        stateB.reps = 8;
        blockBMemory.set(stateB);
        
        // 4. Independent memory inspection (debugging)
        console.log('4. Independent memory inspection:');
        
        const snapshot = memory.getMemorySnapshot();
        console.log(`📊 Total memory allocations: ${snapshot.totalAllocated}`);
        console.log(`📋 Memory by type:`, snapshot.summary.byType);
        console.log(`👤 Memory by owner:`, snapshot.summary.byOwner);
        
        // 5. Verify we can inspect state without affecting execution
        const exerciseStates = memory.getByType('exercise-state');
        exerciseStates.forEach(entry => {
            console.log(`🏋️ Exercise: ${entry.value.name} - ${entry.value.reps} reps`);
        });
        
        // 6. Test automatic cleanup (simulating stack pop)
        console.log('5. Testing automatic cleanup (simulating block removal):');
        
        console.log(`Memory before cleanup: ${memory.getAllReferences().length} references`);
        
        // Release blockA memory (simulating popping from stack)
        memory.release(blockAMemory);
        
        console.log(`Memory after cleanup: ${memory.getAllReferences().length} references`);
        
        // 7. Verify child memory was also cleaned up
        expect(blockAMemory.isValid()).toBe(false);
        expect(blockAMetadata.isValid()).toBe(false);
        expect(blockBMemory.isValid()).toBe(true);
        expect(blockBMetadata.isValid()).toBe(true);
        
        console.log('\n🧠 === Key Benefits Demonstrated ===');
        console.log('✅ Memory can be allocated separately from execution stack');
        console.log('✅ Memory can be inspected independently without affecting execution');
        console.log('✅ Automatic cleanup when references are released');
        console.log('✅ Parent-child memory relationships');
        console.log('✅ Debugging views provide comprehensive state inspection');
        
        // Final assertions
        expect(snapshot.entries.length).toBeGreaterThan(0);
        expect(exerciseStates).toHaveLength(2);
        expect(memory.getAllReferences().length).toBe(2); // blockB and its metadata
    });
});