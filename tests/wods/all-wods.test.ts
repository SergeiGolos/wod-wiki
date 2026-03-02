import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { 
    createSessionContext, 
    startSession, 
    userNext, 
    advanceClock,
    disposeSession, 
    stackInfo 
} from '../jit-compilation/helpers/session-test-utils';

/**
 * Recursively find all markdown files in a directory.
 */
function findMarkdownFiles(dir: string, fileList: string[] = []): string[] {
    const files = readdirSync(dir);
    for (const file of files) {
        const filePath = join(dir, file);
        if (statSync(filePath).isDirectory()) {
            findMarkdownFiles(filePath, fileList);
        } else if (file.endsWith('.md')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

/**
 * Extract WOD blocks from markdown content.
 */
function extractWodBlocks(content: string): string[] {
    const blocks: string[] = [];
    const startMarker = '```wod';
    const endMarker = '```';
    
    let startIndex = content.indexOf(startMarker);
    while (startIndex !== -1) {
        const contentStart = startIndex + startMarker.length;
        const endIndex = content.indexOf(endMarker, contentStart);
        if (endIndex === -1) break;
        
        const block = content.substring(contentStart, endIndex).trim();
        if (block) {
            blocks.push(block);
        }
        
        startIndex = content.indexOf(startMarker, endIndex + endMarker.length);
    }
    return blocks;
}

const wodDir = join(process.cwd(), 'wod');
const mdFiles = findMarkdownFiles(wodDir);

describe('WOD Integration Tests', () => {
    for (const file of mdFiles) {
        const relativePath = relative(wodDir, file);
        const content = readFileSync(file, 'utf-8');
        const wods = extractWodBlocks(content);

        if (wods.length === 0) continue;

        describe(`File: ${relativePath}`, () => {
            wods.forEach((wod, index) => {
                it(`WOD block #${index + 1}`, () => {
                    const ctx = createSessionContext(wod);

                    try {
                        // 1. Start session
                        startSession(ctx);
                        
                        // 2. Verify "Waiting to start" is loaded
                        const info = stackInfo(ctx);
                        expect(info.depth, 'Stack should not be empty after startSession').toBeGreaterThanOrEqual(1);
                        expect(info.blocks, 'Ready to Start should be on the stack').toContain('Ready to Start');
                        
                        // 3. Try to end it as quickly as possible
                        let safetyValve = 0;
                        const maxSteps = 500;
                        
                        while (ctx.runtime.stack.count > 0 && safetyValve < maxSteps) {
                            userNext(ctx);
                            
                            if (safetyValve > 10 && safetyValve % 5 === 0) {
                                advanceClock(ctx, 24 * 60 * 60 * 1000); // 1 day
                            }
                            
                            safetyValve++;
                        }

                        // 4. Verify stack is down to 0
                        if (ctx.runtime.stack.count > 0) {
                            const currentStack = stackInfo(ctx).blocks.join(' > ');
                            throw new Error(`Session failed to terminate after ${safetyValve} steps. Final stack: ${currentStack}`);
                        }
                        expect(ctx.runtime.stack.count).toBe(0);
                        
                    } finally {
                        disposeSession(ctx);
                    }
                });
            });
        });
    }
});
