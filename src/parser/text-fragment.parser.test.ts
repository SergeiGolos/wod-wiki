import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from './md-timer';
import { FragmentType } from '../core/models/CodeFragment';
import { TextFragment } from '../runtime/compiler/fragments/TextFragment';

/**
 * Text Fragment Parser Contract
 */

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Text Fragment Parser Contract', () => {
    it('should parse text fragment starting with //', () => {
        const script = parse('// This is a comment');
        const text = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Text) as TextFragment;

        expect(text).toBeDefined();
        expect(text.value.text).toBe('This is a comment');
    });

    it('should parse text fragment with symbols inside', () => {
        const script = parse('// complex: comment with symbols! @ # $ %');
        const text = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Text) as TextFragment;

        expect(text).toBeDefined();
        expect(text.value.text).toBe('complex: comment with symbols! @ # $ %');
    });

    it('should allow text fragment alongside other fragments', () => {
        const script = parse('10:00 // cool down');
        const timer = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Timer);
        const text = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Text) as TextFragment;

        expect(timer).toBeDefined();
        expect(text).toBeDefined();
        expect(text.value.text).toBe('cool down');
    });

    it('should parse empty text fragment', () => {
        const script = parse('//');
        const text = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Text) as TextFragment;

        expect(text).toBeDefined();
        expect(text.value.text).toBe('');
    });
});
