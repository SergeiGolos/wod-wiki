import { createSessionContext, startSession, userNext, disposeSession, advanceClock } from '../tests/jit-compilation/helpers/session-test-utils';
import { FragmentType } from '../src/core/models/CodeFragment';
import { parseArgs } from "util";

/**
 * Runtime Debugger Script
 * 
 * Usage: bun scripts/debug-runtime.ts --script "5:00 Run" [--steps 5] [--advance 60000]
 */

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    script: { type: "string", short: "s" },
    file: { type: "string", short: "f" },
    steps: { type: "string", short: "n", default: "10" },
    advance: { type: "string", short: "a", default: "0" },
    label: { type: "string", short: "l", default: "Debug Session" },
  },
});

let scriptText = values.script;
if (values.file) {
  scriptText = await Bun.file(values.file).text();
}

if (!scriptText) {
  console.error("Error: No script provided. Use --script or --file.");
  process.exit(1);
}

const ctx = createSessionContext(scriptText);
const maxSteps = parseInt(values.steps!);
const advanceMs = parseInt(values.advance!);

console.log(`
=== Runtime Debug Trace: ${values.label} ===`);
console.log(`Script:
${scriptText.split('
').map(l => '  ' + l).join('
')}
`);

function dump() {
    if (ctx.tracer.outputs.length === 0) return;
    
    ctx.tracer.outputs.forEach(o => {
        const frags = o.fragmentTypes.length > 0 ? ` frags=[${o.fragmentTypes.join(', ')}]` : '';
        const labelFrag = o.raw.fragments?.find((f: any) => f.fragmentType === FragmentType.Label);
        const label = labelFrag ? (labelFrag.image || labelFrag.value) : '';
        console.log(`  [${o.index}] type=${o.outputType.padEnd(12)} level=${o.stackLevel} label=${label.padEnd(20)} block=${o.sourceBlockKey.slice(0, 8)}${frags}`);
    });
    ctx.tracer.clear();
}

console.log('--- Action: Start Session ---');
startSession(ctx, { label: values.label });
dump();

for (let i = 1; i <= maxSteps; i++) {
    if (ctx.runtime.stack.count === 0) {
        console.log('
--- Session Completed ---');
        break;
    }

    if (advanceMs > 0) {
        console.log(`
--- Action: Advance Clock (${advanceMs}ms) ---`);
        advanceClock(ctx, advanceMs);
        dump();
    }

    console.log(`
--- Action: User Next (Step ${i}) ---`);
    userNext(ctx);
    dump();
}

disposeSession(ctx);
