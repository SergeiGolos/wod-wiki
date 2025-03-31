import { test, expect } from "vitest";
import { fragmentToPart } from "@/core/utils";
import { MdTimerRuntime } from "@/core/parser/md-timer";


test(`parsedDirectionUpDefault`, async () => {    
    const runtime = new MdTimerRuntime();
    const { statements } = runtime.read(":11");    
    
    expect(statements).toHaveLength(1);
    const statement = statements[0];
    
    const fragment = fragmentToPart(statement, 'duration');
    expect(fragment).not.toBeNull();
    expect(fragment).toBe("0:11");
});

test(`parsedDirectionUpExplicit`, async () => {    
    const runtime = new MdTimerRuntime();
    const { statements } = runtime.read("00:11^");    
    
    expect(statements).toHaveLength(1);
    const statement = statements[0];

    const durationFragment = fragmentToPart(statement, 'duration');
    expect(durationFragment).not.toBeNull();
    expect(durationFragment).toBe("0:11");
    
    
    const incrementFragment = fragmentToPart(statement, 'increment');
    expect(incrementFragment).not.toBeNull();
    expect(incrementFragment).toBe("⬆️");
});

test(`parsedDirectionDownExplicit`, async () => {   
    const runtime = new MdTimerRuntime();
    const { statements } = runtime.read("00:11");    
    
    expect(statements).toHaveLength(1);
    const statement = statements[0];    

    const durationFragment = fragmentToPart(statement, 'duration');
    expect(durationFragment).not.toBeNull();
    expect(durationFragment).toBe("0:11");
    
    const incrementFragment = fragmentToPart(statement, 'increment');
    expect(incrementFragment).not.toBeNull();
    expect(incrementFragment).toBe("⬇️");
});

test(`parsedMinutes`, async () => {    
    const runtime = new MdTimerRuntime();
    const { statements } = runtime.read("11:00");
    
    expect(statements).toHaveLength(1);
    const statement = statements[0];
    
    const fragment = fragmentToPart(statement, 'duration');
    expect(fragment).not.toBeNull();
    expect(fragment).toBe("11:00");
});

test(`parsedHours`, async () => {    
    const runtime = new MdTimerRuntime();
    const { statements } = runtime.read("11:00:00");
    
    expect(statements).toHaveLength(1);
    const statement = statements[0];
    
    const fragment = fragmentToPart(statement, 'duration');
    expect(fragment).not.toBeNull();
    expect(fragment).toBe("11:00:00");
});

test(`parsedDays`, async () => {    
    const runtime = new MdTimerRuntime();
    const { statements } = runtime.read("11:00:00:00");
    
    expect(statements).toHaveLength(1);
    const statement = statements[0];
    
    const fragment = fragmentToPart(statement, 'duration');
    expect(fragment).not.toBeNull();
    expect(fragment).toBe("11:00:00:00");
});

test(`parseMultipleLines`, async () => {    
    const runtime = new MdTimerRuntime();
    const { statements } = runtime.read(`:11\r\n:22`);
    
    expect(statements).toHaveLength(2);
    
    // First timer
    const statement1 = statements[0];
    const fragment1 = fragmentToPart(statement1, 'duration');
    expect(fragment1).not.toBeNull();
    expect(fragment1).toBe("0:11");
    
    // Second timer
    const statement2 = statements[1];
    const fragment2 = fragmentToPart(statement2, 'duration');
    expect(fragment2).not.toBeNull();
    expect(fragment2).toBe("0:22");
});

test(`parseMultipleLinesInGroup`, async () => {    
    const runtime = new MdTimerRuntime();
    const { statements } = runtime.read(`[11\r\n22]`);    
    
    expect(statements).toHaveLength(2);
    
    // First timer
    const statement1 = statements[0];
    const fragment1 = fragmentToPart(statement1, 'rep');
    expect(fragment1).not.toBeNull();
    expect(fragment1).toBe("11");
    
    // Second timer
    const statement2 = statements[1];
    const fragment2 = fragmentToPart(statement2, 'rep');
    expect(fragment2).not.toBeNull();
    expect(fragment2).toBe("22");
});

test(`MultiLinePaseWithBlankLine`, async () => {    
    const runtime = new MdTimerRuntime();
    const { statements } = runtime.read(`11\r\n22\r\n\r\n33`);
    
    expect(statements).toHaveLength(3);
    
    // First timer
    const statement1 = statements[0];
    const fragment1 = fragmentToPart(statement1, 'rep');
    expect(fragment1).not.toBeNull();
    expect(fragment1).toBe("11");
    
    // Second timer
    const statement2 = statements[1];
    const fragment2 = fragmentToPart(statement2, 'rep');
    expect(fragment2).not.toBeNull();
    expect(fragment2).toBe("22");
    
    // Third timer
    const statement3 = statements[2];
    const fragment3 = fragmentToPart(statement3, 'rep');
    expect(fragment3).not.toBeNull();
    expect(fragment3).toBe("33");
});

test(`multiplierOnTimer`, async () => {    
    const runtime = new MdTimerRuntime();
    const { statements } = runtime.read(":11 (2)");        
    
    expect(statements).toHaveLength(1);
    
    // Timer with multiplier
    const statement = statements[0];
    const roundsFragment = fragmentToPart(statement, 'rounds');
    expect(roundsFragment).not.toBeNull();
    expect(roundsFragment).toBe("2");
    
    const durationFragment = fragmentToPart(statement, 'duration');
    expect(durationFragment).not.toBeNull();
    expect(durationFragment).toBe("0:11");
});