import { test, expect } from "vitest";
import { MdTimerRuntime } from "./md-timer";

test(`parsedDirectionUpDefault`, async () => {    
    const runtime = new MdTimerRuntime();
    const { outcome} = runtime.read(":11");    
    
    expect(outcome[0].duration).toBe(11);    
});
 
test(`parsedDirectionUpExplicit`, async () => {    
    const runtime = new MdTimerRuntime();
    const { outcome } = runtime.read("+:11");    
    
    expect(outcome[0].duration).toBe(11);    
});

test(`parsedDirectionDownExplicit`, async () => {    
    const runtime = new MdTimerRuntime();
    const { outcome } = runtime.read("-:11");    
    
    expect(outcome[0].duration).toBe(-11);    
});


test(`parsedMinutes`, async () => {    
    const runtime = new MdTimerRuntime();
    const { outcome } = runtime.read("11:00");
    const timer = outcome[0].duration as number
    
    expect(timer).toBe(11 * 60);    
});

test(`parsedHours`, async () => {    
    const runtime = new MdTimerRuntime();
    const { outcome } = runtime.read("11:00:00");
    const timer = outcome[0].duration as number
    
    expect(timer).toBe(11 * 60 * 60);    
});

test(`parsedDays`, async () => {    
    const runtime = new MdTimerRuntime();
    const { outcome } = runtime.read("11:00:00:00");
    const timer = outcome[0].duration as number
    expect(timer).toBe(11 * 60 * 60 * 24);
});


test(`parseMultipleLines`, async () => {    
    const runtime = new MdTimerRuntime();
    const { outcome } = runtime.read(`:11\r\n-:22`);

    expect(outcome[0].duration).toBe(11);
    expect(outcome[1].duration).toBe(-22);    
});

// test(`parseMultipleLinesInGroup`, async () => {    
//     const runtime = new MdTimerRuntime();
//     const { outcome } = runtime.read(`[11\r\n-22]`);    
//     expect(outcome[0].timer).toBe(11);
//     expect(outcome[1].timer).toBe(22);    
// });


// test(`parseMultipleLinesInMixedGroupAndStandAlone`, async () => {    
//     const runtime = new MdTimerRuntime();
//     const { outcome } = runtime.read(`[\r\n11\r\n-22\r\n]\r\n33`);
    
//     expect(outcome[0].timer).toBe(11);
//     expect(outcome[1].timer).toBe(22);    
//     expect(outcome[2].timer).toBe(33);    
// });


// test(`parseMultipleLinesInMixedGroupAndStandAlone`, async () => {    
//     const runtime = new MdTimerRuntime();
//     const { outcome } = runtime.read(`[\r\n11\r\n-22\r\n](test1,test2)\r\n33`);
    
//     expect(outcome[0].timer).toBe(11);
//     expect(outcome[1].timer).toBe(22);    
//     expect(outcome[2].timer).toBe(11);
//     expect(outcome[3].timer).toBe(22);        
//     expect(outcome[4].timer).toBe(33);    
// });

// test(`multiplierOnTimer`, async () => {    
//     const runtime = new MdTimerRuntime();
//     const { outcome } = runtime.read(":11 (2)");        
//     const timer = outcome[1].duration as number;
    
//     expect(timer).toBe(11 * 2);    
// });