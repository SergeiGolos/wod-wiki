
import { OutputStatement } from '../src/core/models/OutputStatement';
import { TimeSpan } from '../src/runtime/models/TimeSpan';

const now = Date.now();
const timeSpan = new TimeSpan(now, now + 5000);
const output = new OutputStatement({
    outputType: 'segment',
    timeSpan,
    sourceBlockKey: 'test-block',
    stackLevel: 0,
});

console.log('--- OutputStatement Serialization Check ---');
const json = JSON.stringify(output);
console.log('Serialized JSON includes "elapsed"?', json.includes('"elapsed":'));
console.log('Serialized JSON includes "total"?', json.includes('"total":'));

const parsed = JSON.parse(json);
console.log('Parsed elapsed:', parsed.elapsed);
console.log('Parsed total:', parsed.total);

if (parsed.elapsed === 5000 && parsed.total === 5000) {
    console.log('SUCCESS: Elapsed and Total are correctly serialized.');
} else {
    console.log('FAILURE: Elapsed or Total are missing or incorrect.');
}
