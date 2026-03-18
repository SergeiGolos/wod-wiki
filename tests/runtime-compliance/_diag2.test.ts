import { describe, it, expect } from 'bun:test';
import { sharedParser } from '@/parser/parserInstance';
import { WodScript } from '@/parser/WodScript';

function dumpScriptFull(label: string, text: string) {
    const script = sharedParser.read(text) as WodScript;
    console.log(`\n=== ${label} ===`);
    script.statements.forEach((s, i) => {
        console.log(`  stmt[${i}] id=${s.id} depth=${(s as any).depth} children=${JSON.stringify(s.children)} metrics=${JSON.stringify(s.metrics.map(m=>({type:m.type,value:m.value})))}`);
    });
}

describe('Diagnostic2 — children', () => {
    it('95 lb / (3) / Clean & Jerk', () => {
        dumpScriptFull('95 lb cascade', '95 lb\n(3)\n  Clean & Jerk');
        expect(true).toBe(true);
    });
    it('95 lb / Clean 135 lb / Snatch', () => {
        dumpScriptFull('95 lb override', '95 lb\n  Clean 135 lb\n  Snatch');
        expect(true).toBe(true);
    });
    it('400 m / (3) / Run', () => {
        dumpScriptFull('400 m cascade', '400 m\n(3)\n  Run');
        expect(true).toBe(true);
    });
    it('75 kg / EMOM / rounds / Clean', () => {
        dumpScriptFull('75 kg three-level', '75 kg\n(5) 1:00 EMOM\n  (3)\n    Clean');
        expect(true).toBe(true);
    });
});
