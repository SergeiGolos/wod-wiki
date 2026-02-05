import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from './md-timer';
import { GroupFragment } from '../runtime/compiler/fragments/GroupFragment';
import { FragmentType } from '../core/models/CodeFragment';

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Group fragment parsing', () => {
    it('parses compose marker (+) with group=compose', () => {
        const script = parse('+ 5:00');
        const group = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Group) as GroupFragment;

        expect(group).toBeDefined();
        expect(group.group).toBe('compose');
        expect(group.value).toBe('compose');
        expect(group.image).toBe('+');
    });

    it('parses round marker (-) with group=round', () => {
        const script = parse('- 5:00');
        const group = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Group) as GroupFragment;

        expect(group).toBeDefined();
        expect(group.group).toBe('round');
        expect(group.value).toBe('round');
        expect(group.image).toBe('-');
    });
});
