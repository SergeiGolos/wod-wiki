import { describe, it } from 'bun:test';
import { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { wodscriptLanguage } from '@/parser/wodscript-language';

function printTree(input: string): string {
    const doc = input.endsWith('\n') ? input : input + '\n';
    const state = EditorState.create({ doc, extensions: [wodscriptLanguage] });
    const tree = syntaxTree(state);
    const parts: string[] = [];
    tree.iterate({
        enter(node) {
            const text = state.doc.sliceString(node.from, node.to).replace(/\n/g, '↵');
            parts.push(`${'  '.repeat(node.depth)}${node.name}[${node.from}:${node.to}]="${text}"`);
        }
    });
    return parts.join('\n');
}

describe('Lezer CST inspection', () => {
    for (const input of ['1.5km Run', '1.5 km Run', '400m Run', '400 m Run', '4mile Run', '4 mile Run']) {
        it(JSON.stringify(input), () => {
            const tree = printTree(input);
            console.log(`\n--- ${input} ---\n${tree}`);
        });
    }
});
