import { test, expect } from "vitest";
import { MdTimerRuntime } from "./md-timer";
import { SourceDisplayBlock } from "./SourceDisplayBlock";
import { IRuntimeHandler } from "./timer.types";

test(`parsedDirectionUpDefault`, async () => {    
    const runtime = new MdTimerRuntime();
    const handler = {} as IRuntimeHandler;
    const { outcome} = runtime.read(":11");    
    const result = new SourceDisplayBlock(outcome[0], handler, () => outcome[0]);
    
    expect(result.getDuration()?.[0]?.duration).toBe(11);    
});
 
test(`parsedDirectionUpExplicit`, async () => {    
    const runtime = new MdTimerRuntime();
    const handler = {} as IRuntimeHandler;
    const { outcome } = runtime.read(":11^");    
    const result = new SourceDisplayBlock(outcome[0], handler, () => outcome[0]);
    
    expect(result.getDuration()?.[0].duration).toBe(11);    
    expect(result.getIncrement()?.[0].increment).toBe(1);    
});

test(`parsedDirectionDownExplicit`, async () => {    
    const runtime = new MdTimerRuntime();
    const handler = {} as IRuntimeHandler;
    const { outcome } = runtime.read(":11");    
    const result = new SourceDisplayBlock(outcome[0], handler, () => outcome[0]);
    
    expect(result.getDuration()?.[0].duration).toBe(11);    
    expect(result.getIncrement()?.[0].increment).toBe(-1);    
});

test(`parsedMinutes`, async () => {    
    const runtime = new MdTimerRuntime();
    const handler = {} as IRuntimeHandler;
    const { outcome } = runtime.read("11:00");
    const result = new SourceDisplayBlock(outcome[0], handler, () => outcome[0]);
    const timer = result.getDuration()?.[0].duration as number
    
    expect(timer).toBe(11 * 60);    
});

test(`parsedHours`, async () => {    
    const runtime = new MdTimerRuntime();
    const handler = {} as IRuntimeHandler;
    const { outcome } = runtime.read("11:00:00");
    const result = new SourceDisplayBlock(outcome[0], handler, () => outcome[0]);
    const timer = result.getDuration()?.[0].duration as number
    
    expect(timer).toBe(11 * 60 * 60);    
});

test(`parsedDays`, async () => {    
    const runtime = new MdTimerRuntime();
    const handler = {} as IRuntimeHandler;
    const { outcome } = runtime.read("11:00:00:00");
    const result = new SourceDisplayBlock(outcome[0], handler, () => outcome[0]);
    const timer = result.getDuration()?.[0].duration as number
    expect(timer).toBe(11 * 60 * 60 * 24);
});

test(`parseMultipleLines`, async () => {    
    const runtime = new MdTimerRuntime();
    const handler = {} as IRuntimeHandler;
    const { outcome } = runtime.read(`:11\r\n:22`);
    const result1 = new SourceDisplayBlock(outcome[0], handler, () => outcome[0]);
    const result2 = new SourceDisplayBlock(outcome[1], handler, () => outcome[1]);
    
    expect(result1.getDuration()?.[0].duration).toBe(11);
    
    expect(result2.getDuration()?.[0].duration).toBe(22);    
});

// test(`parseMultipleLinesInGroup`, async () => {    
//     const runtime = new MdTimerRuntime();
//     const { outcome } = runtime.read(`[11\r\n-22]`);    
//     expect(outcome[0].fragments.find(f => f.type === "duration")?.duration).toBe(11);
//     expect(outcome[1].fragments.find(f => f.type === "duration")?.duration).toBe(22);    
// });


// test(`parseMultipleLinesInMixedGroupAndStandAlone`, async () => {    
//     const runtime = new MdTimerRuntime();
//     const { outcome } = runtime.read(`[\r\n11\r\n-22\r\n]\r\n33`);
    
//     expect(outcome[0].fragments.find(f => f.type === "duration")?.duration).toBe(11);
//     expect(outcome[1].fragments.find(f => f.type === "duration")?.duration).toBe(22);    
//     expect(outcome[2].fragments.find(f => f.type === "duration")?.duration).toBe(33);    
// });


// test(`parseMultipleLinesInMixedGroupAndStandAlone`, async () => {    
//     const runtime = new MdTimerRuntime();
//     const { outcome } = runtime.read(`[\r\n11\r\n-22\r\n](test1,test2)\r\n33`);
    
//     expect(outcome[0].fragments.find(f => f.type === "duration")?.duration).toBe(11);
//     expect(outcome[1].fragments.find(f => f.type === "duration")?.duration).toBe(22);    
//     expect(outcome[2].fragments.find(f => f.type === "duration")?.duration).toBe(11);
//     expect(outcome[3].fragments.find(f => f.type === "duration")?.duration).toBe(22);        
//     expect(outcome[4].fragments.find(f => f.type === "duration")?.duration).toBe(33);    
// });

// test(`multiplierOnTimer`, async () => {    
//     const runtime = new MdTimerRuntime();
//     const { outcome } = runtime.read(":11 (2)");        
//     const timer = outcome[1].fragments.find(f => f.type === "duration")?.duration as number;
    
//     expect(timer).toBe(11 * 2);    
// });