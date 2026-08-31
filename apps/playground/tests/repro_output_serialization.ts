import { OutputStatement } from '@bitcobblers/wod-wiki-engine';
import { TimeSpan } from '@bitcobblers/wod-wiki-engine';

const now = Date.now();
const timeSpan = new TimeSpan(now, now + 5000);
const output = new OutputStatement({
    outputType: 'segment',
    timeSpan,
    sourceBlockKey: 'test-block',
    stackLevel: 0,
});

process.stdout.write('--- OutputStatement Serialization Check ---\n');
const json = JSON.stringify(output);
process.stdout.write(`Serialized JSON includes "elapsed"? ${json.includes('"elapsed":')}\n`);
process.stdout.write(`Serialized JSON includes "total"? ${json.includes('"total":')}\n`);

const parsed = JSON.parse(json) as { elapsed?: number; total?: number };
process.stdout.write(`Parsed elapsed: ${parsed.elapsed}\n`);
process.stdout.write(`Parsed total: ${parsed.total}\n`);

if (parsed.elapsed === 5000 && parsed.total === 5000) {
    process.stdout.write('SUCCESS: Elapsed and Total are correctly serialized.\n');
} else {
    process.stdout.write('FAILURE: Elapsed or Total are missing or incorrect.\n');
}
