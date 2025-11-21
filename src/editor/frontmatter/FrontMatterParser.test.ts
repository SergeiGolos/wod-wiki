import { describe, it, expect } from 'vitest';
import { FrontMatterParser } from './FrontMatterParser';

describe('FrontMatterParser', () => {
    it('should parse a simple front matter block at the start', () => {
        const lines = [
            '---',
            'title: Hello World',
            'author: Me',
            '---',
            '# Content'
        ];
        const blocks = FrontMatterParser.parse(lines);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].startLine).toBe(1);
        expect(blocks[0].endLine).toBe(4);
        expect(blocks[0].properties).toEqual({
            title: 'Hello World',
            author: 'Me'
        });
    });

    it('should parse multiple blocks', () => {
        const lines = [
            '---',
            'p1: v1',
            '---',
            'text',
            '---',
            'p2: v2',
            '---'
        ];
        const blocks = FrontMatterParser.parse(lines);
        expect(blocks).toHaveLength(2);
        expect(blocks[0].properties).toEqual({ p1: 'v1' });
        expect(blocks[1].properties).toEqual({ p2: 'v2' });
    });

    it('should ignore incomplete blocks', () => {
        const lines = [
            '---',
            'p1: v1',
            'text'
        ];
        const blocks = FrontMatterParser.parse(lines);
        expect(blocks).toHaveLength(0);
    });

    it('should handle whitespace', () => {
        const lines = [
            '---',
            '  key  :  value  ',
            '---'
        ];
        const blocks = FrontMatterParser.parse(lines);
        expect(blocks[0].properties).toEqual({ key: 'value' });
    });
});
